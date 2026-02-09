// ============================================================================
// MISSION COMPLETION AS SMART CONTRACT WORKFLOW
// ============================================================================

// Step 1: Create mission and its associated contract
async function createMission({
  title,
  difficulty,
  estimatedHours,
  skillProofsAwarded
}: MissionDetails) {
  
  // Create the contract first
  const missionContract = await things.create({
    groupId: "futures_edge_org",
    type: "action_contract",
    name: `Contract: ${title}`,
    properties: {
      contractType: "mission",
      title,
      description: `Complete mission: ${title}`,
      
      // Who can accept this contract
      eligibility: {
        minTrustScore: 0,
        requiredRank: ["recruit", "novice", "member"],
        maxActiveContracts: 3
      },
      
      // What work must be done
      requirements: {
        action: `Complete ${title} mission`,
        deliverables: [
          "Submission document (1500+ words)",
          "Practical examples or code samples",
          "Reflection on learnings"
        ],
        constraints: {
          maxDuration: estimatedHours * 2, // flexible deadline
          qualityStandards: "professional"
        }
      },
      
      // What proof is required
      requiredProof: {
        proofTypes: ["submission_document", "peer_review"],
        minimumReviews: 2,
        reviewerCriteria: {
          minTrustScore: 100, // reviewers must be established
          requiredBadge: skillProofsAwarded[0] // or have completed this mission
        },
        reviewThreshold: 3.5, // avg rating out of 5
        autoVerify: false
      },
      
      // What value is generated
      valueGenerated: {
        organizationalValue: {
          knowledgeAsset: true, // submission becomes knowledge article
          communityGrowth: 0,
          skillsDeveloped: 1
        },
        individualValue: {
          trustPoints: 50,
          impactScore: 10,
          tokens: 100,
          skillBadges: skillProofsAwarded
        }
      },
      
      // How rewards split
      rewardDistribution: {
        actor: 0.75, // 75% to person completing mission
        reviewers: 0.20, // 20% split among peer reviewers
        platform: 0.05 // 5% to platform
      },
      
      // When this contract is valid
      validityPeriod: {
        startDate: Date.now(),
        endDate: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days
        maxFulfillments: 1000 // allow 1000 members to complete
      },
      
      status: "active",
      createdBy: "system",
      createdAt: Date.now()
    }
  })
  
  // Create the mission entity (references contract)
  const mission = await things.create({
    groupId: "futures_edge_org",
    type: "mission",
    name: title,
    properties: {
      title,
      slug: slugify(title),
      description: `Learn about ${title}`,
      
      missionType: "standard",
      category: "technical",
      difficulty,
      estimatedHours,
      
      skillsLearned: skillProofsAwarded,
      skillProofsAwarded,
      
      isSolo: true,
      isCollaborative: false,
      
      contractId: missionContract._id, // Link to contract
      
      deliverables: [
        "Comprehensive submission document",
        "Practical examples",
        "Reflection essay"
      ],
      submissionGuidelines: `
        Your submission should demonstrate:
        1. Understanding of core concepts
        2. Ability to apply knowledge practically
        3. Critical thinking and reflection
      `,
      
      status: "published",
      publishedAt: Date.now()
    }
  })
  
  // Link mission to contract
  await connections.create({
    fromEntityId: mission._id,
    toEntityId: missionContract._id,
    relationshipType: "backed_by_contract"
  })
  
  // Log creation
  await events.log({
    type: "mission_created",
    actorId: "system",
    targetId: mission._id,
    timestamp: Date.now(),
    metadata: {
      contractId: missionContract._id,
      difficulty,
      estimatedReward: 75 // tokens (actor's 75% share)
    }
  })
  
  return { mission, missionContract }
}

// Step 2: Member enrolls in mission (accepts contract)
async function enrollInMission(memberId: string, missionId: string) {
  
  // Get mission and its contract
  const mission = await things.get(missionId)
  const contract = await things.get(mission.properties.contractId)
  
  // Verify eligibility
  const member = await things.get(memberId)
  
  if (member.properties.trustScore < contract.properties.eligibility.minTrustScore) {
    throw new Error("Insufficient trust score")
  }
  
  if (member.properties.activeContracts >= contract.properties.eligibility.maxActiveContracts) {
    throw new Error("Too many active contracts")
  }
  
  // Create enrollment record
  const enrollment = await things.create({
    groupId: member.groupId,
    type: "mission_enrollment",
    name: `${member.properties.displayName} → ${mission.name}`,
    properties: {
      memberId,
      missionId,
      
      enrolledAt: Date.now(),
      targetCompletionDate: Date.now() + (mission.properties.estimatedHours * 60 * 60 * 1000),
      
      progressPercentage: 0,
      phasesCompleted: [],
      
      status: "enrolled"
    }
  })
  
  // Accept contract (creates fulfillment record)
  const fulfillment = await things.create({
    groupId: member.groupId,
    type: "contract_fulfillment",
    name: `Fulfillment: ${mission.name}`,
    properties: {
      contractId: contract._id,
      actorId: memberId,
      
      acceptedAt: Date.now(),
      estimatedCompletionDate: Date.now() + (mission.properties.estimatedHours * 60 * 60 * 1000),
      
      verificationStatus: "pending",
      reviews: [],
      
      valueAwarded: null
    }
  })
  
  // Link fulfillment to contract
  await connections.create({
    fromEntityId: fulfillment._id,
    toEntityId: contract._id,
    relationshipType: "fulfills"
  })
  
  // Link member to contract
  await connections.create({
    fromEntityId: memberId,
    toEntityId: contract._id,
    relationshipType: "accepted_contract",
    metadata: {
      acceptedAt: Date.now(),
      fulfillmentId: fulfillment._id,
      priority: "normal"
    }
  })
  
  // Link member to mission
  await connections.create({
    fromEntityId: memberId,
    toEntityId: missionId,
    relationshipType: "enrolled_in",
    metadata: {
      enrolledAt: Date.now(),
      enrollmentId: enrollment._id,
      status: "enrolled"
    }
  })
  
  // Update member's active contracts
  await things.update(memberId, {
    "properties.activeContracts": member.properties.activeContracts + 1
  })
  
  // Update contract fulfillment tracking
  await things.update(contract._id, {
    "properties.validityPeriod.currentFulfillments": 
      (contract.properties.validityPeriod.currentFulfillments || 0) + 1
  })
  
  // Log events
  await events.log({
    type: "contract_accepted",
    actorId: memberId,
    targetId: contract._id,
    timestamp: Date.now(),
    metadata: {
      missionId,
      enrollmentId: enrollment._id,
      fulfillmentId: fulfillment._id,
      expectedReward: 75 // tokens
    }
  })
  
  await events.log({
    type: "mission_enrolled",
    actorId: memberId,
    targetId: missionId,
    timestamp: Date.now(),
    metadata: {
      enrollmentId: enrollment._id
    }
  })
  
  return { enrollment, fulfillment }
}

// Step 3: Member submits mission (provides proof)
async function submitMission(
  memberId: string,
  missionId: string,
  submission: {
    documentUrl: string,
    documentHash: string,
    reflection: string
  }
) {
  
  // Get enrollment and fulfillment
  const enrollment = await db.query("things")
    .filter(q => 
      q.eq(q.field("type"), "mission_enrollment") &&
      q.eq(q.field("properties.memberId"), memberId) &&
      q.eq(q.field("properties.missionId"), missionId)
    )
    .first()
  
  const fulfillment = await things.get(enrollment.properties.contractFulfillmentId)
  const mission = await things.get(missionId)
  const contract = await things.get(mission.properties.contractId)
  
  // Create proof artifact
  const proof = await things.create({
    groupId: enrollment.groupId,
    type: "proof_artifact",
    name: `Submission: ${mission.name}`,
    properties: {
      fulfillmentId: fulfillment._id,
      artifactType: "submission_document",
      
      content: submission.documentUrl, // IPFS hash or S3 URL
      contentHash: submission.documentHash,
      title: `${mission.name} Submission`,
      description: submission.reflection,
      
      storageLocation: "ipfs",
      storageUrl: submission.documentUrl,
      
      metadata: {
        mimeType: "application/pdf",
        submittedFor: "mission_completion"
      },
      
      attestations: [], // Will be populated by reviewers
      
      timestamp: Date.now(),
      submittedBy: memberId
    }
  })
  
  // Link proof to fulfillment
  await connections.create({
    fromEntityId: fulfillment._id,
    toEntityId: proof._id,
    relationshipType: "provides_proof",
    metadata: {
      proofOrder: 1,
      required: true
    }
  })
  
  // Update fulfillment record
  await things.update(fulfillment._id, {
    "properties.submittedAt": Date.now(),
    "properties.proofSubmitted": [{
      proofId: proof._id,
      proofType: "submission_document",
      submittedAt: Date.now()
    }],
    "properties.verificationStatus": "under_review"
  })
  
  // Update enrollment
  await things.update(enrollment._id, {
    "properties.status": "submitted",
    "properties.progressPercentage": 100
  })
  
  // Log events
  await events.log({
    type: "proof_submitted",
    actorId: memberId,
    targetId: fulfillment._id,
    timestamp: Date.now(),
    metadata: {
      proofId: proof._id,
      missionId,
      contractId: contract._id,
      requiresReview: true,
      minimumReviews: contract.properties.requiredProof.minimumReviews
    }
  })
  
  await events.log({
    type: "mission_submitted",
    actorId: memberId,
    targetId: missionId,
    timestamp: Date.now(),
    metadata: {
      enrollmentId: enrollment._id,
      fulfillmentId: fulfillment._id
    }
  })
  
  // Trigger review requests to eligible peers
  await requestPeerReviews(fulfillment._id, contract.properties.requiredProof)
  
  return { proof, fulfillment }
}

// Step 4: Peer review (verifies proof)
async function submitPeerReview(
  reviewerId: string,
  fulfillmentId: string,
  review: {
    rating: number, // 1-5
    feedback: string,
    strengths: string[],
    improvements: string[]
  }
) {
  
  const fulfillment = await things.get(fulfillmentId)
  const contract = await things.get(fulfillment.properties.contractId)
  const proof = await getProofForFulfillment(fulfillmentId)
  
  // Verify reviewer eligibility
  const reviewer = await things.get(reviewerId)
  const criteria = contract.properties.requiredProof.reviewerCriteria
  
  if (reviewer.properties.trustScore < criteria.minTrustScore) {
    throw new Error("Insufficient trust score to review")
  }
  
  // Add attestation to proof
  const attestation = {
    attesterId: reviewerId,
    attestationType: "peer_review",
    result: review.rating >= 3 ? "pass" : "needs_revision",
    score: review.rating,
    notes: review.feedback,
    timestamp: Date.now(),
    signature: await signAttestation(reviewerId, proof._id, review.rating)
  }
  
  await things.update(proof._id, {
    "properties.attestations": [
      ...proof.properties.attestations,
      attestation
    ]
  })
  
  // Add review to fulfillment
  const reviewRecord = {
    reviewerId,
    rating: review.rating,
    feedback: review.feedback,
    strengths: review.strengths,
    improvements: review.improvements,
    reviewedAt: Date.now()
  }
  
  await things.update(fulfillment._id, {
    "properties.reviews": [
      ...fulfillment.properties.reviews,
      reviewRecord
    ]
  })
  
  // Link reviewer to fulfillment
  await connections.create({
    fromEntityId: fulfillment._id,
    toEntityId: reviewerId,
    relationshipType: "reviewed_by",
    metadata: {
      rating: review.rating,
      feedback: review.feedback,
      reviewedAt: Date.now(),
      reviewDuration: 30 // minutes
    }
  })
  
  // Log review event
  await events.log({
    type: "review_completed",
    actorId: reviewerId,
    targetId: fulfillment._id,
    timestamp: Date.now(),
    metadata: {
      rating: review.rating,
      proofId: proof._id
    }
  })
  
  // Check if verification threshold met
  const allReviews = fulfillment.properties.reviews
  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
  
  const meetsThreshold = 
    allReviews.length >= contract.properties.requiredProof.minimumReviews &&
    avgRating >= contract.properties.requiredProof.reviewThreshold
  
  if (meetsThreshold) {
    // Automatically approve fulfillment
    await approveFulfillment(fulfillment._id, avgRating)
  }
  
  return { attestation, avgRating, reviewsComplete: meetsThreshold }
}

// Step 5: Approve and distribute rewards
async function approveFulfillment(fulfillmentId: string, avgRating: number) {
  
  const fulfillment = await things.get(fulfillmentId)
  const contract = await things.get(fulfillment.properties.contractId)
  const actorId = fulfillment.properties.actorId
  const reviewers = fulfillment.properties.reviews
  
  // Calculate actual rewards (can include quality bonuses)
  const qualityMultiplier = avgRating >= 4.5 ? 1.2 : 1.0
  const baseRewards = contract.properties.valueGenerated.individualValue
  
  const actualRewards = {
    trustPoints: Math.floor(baseRewards.trustPoints * qualityMultiplier),
    impactScore: baseRewards.impactScore,
    tokens: Math.floor(baseRewards.tokens * qualityMultiplier),
    skillBadges: baseRewards.skillBadges
  }
  
  // Update fulfillment
  await things.update(fulfillment._id, {
    "properties.verificationStatus": "approved",
    "properties.verifiedAt": Date.now(),
    "properties.avgRating": avgRating,
    "properties.valueAwarded": actualRewards,
    "properties.rewardsDistributed": false
  })
  
  // Log verification
  await events.log({
    type: "verification_completed",
    actorId: "system",
    targetId: fulfillment._id,
    timestamp: Date.now(),
    metadata: {
      avgRating,
      qualityMultiplier,
      valueAwarded: actualRewards
    }
  })
  
  // Distribute rewards to actor
  const actorShare = actualRewards.tokens * contract.properties.rewardDistribution.actor
  
  await connections.create({
    fromEntityId: fulfillment._id,
    toEntityId: actorId,
    relationshipType: "awarded_to",
    metadata: {
      trustPoints: actualRewards.trustPoints,
      impactScore: actualRewards.impactScore,
      tokens: Math.floor(actorShare),
      skillBadges: actualRewards.skillBadges,
      role: "actor",
      distributedAt: Date.now()
    }
  })
  
  // Update actor's totals
  const actor = await things.get(actorId)
  await things.update(actorId, {
    "properties.trustScore": actor.properties.trustScore + actualRewards.trustPoints,
    "properties.impactScore": actor.properties.impactScore + actualRewards.impactScore,
    "properties.tokenBalance": actor.properties.tokenBalance + Math.floor(actorShare),
    "properties.skillBadges": [...new Set([
      ...actor.properties.skillBadges,
      ...actualRewards.skillBadges
    ])],
    "properties.completedMissions": actor.properties.completedMissions + 1,
    "properties.activeContracts": actor.properties.activeContracts - 1,
    "properties.totalContractsCompleted": actor.properties.totalContractsCompleted + 1
  })
  
  await events.log({
    type: "reward_distributed",
    actorId: "system",
    targetId: actorId,
    timestamp: Date.now(),
    metadata: {
      amount: Math.floor(actorShare),
      trustPoints: actualRewards.trustPoints,
      impactScore: actualRewards.impactScore,
      skillBadges: actualRewards.skillBadges,
      reason: "mission_completion",
      fulfillmentId: fulfillment._id
    }
  })
  
  // Distribute rewards to reviewers
  const reviewerShare = actualRewards.tokens * contract.properties.rewardDistribution.reviewers
  const perReviewer = Math.floor(reviewerShare / reviewers.length)
  
  for (const review of reviewers) {
    await connections.create({
      fromEntityId: fulfillment._id,
      toEntityId: review.reviewerId,
      relationshipType: "awarded_to",
      metadata: {
        tokens: perReviewer,
        gratitudePoints: 10,
        role: "peer_reviewer",
        distributedAt: Date.now()
      }
    })
    
    const reviewer = await things.get(review.reviewerId)
    await things.update(review.reviewerId, {
      "properties.tokenBalance": reviewer.properties.tokenBalance + perReviewer,
      "properties.gratitudePoints": reviewer.properties.gratitudePoints + 10
    })
    
    await events.log({
      type: "reward_distributed",
      actorId: "system",
      targetId: review.reviewerId,
      timestamp: Date.now(),
      metadata: {
        amount: perReviewer,
        gratitudePoints: 10,
        reason: "peer_review",
        fulfillmentId: fulfillment._id
      }
    })
  }
  
  // Platform fee
  const platformFee = actualRewards.tokens * contract.properties.rewardDistribution.platform
  await events.log({
    type: "reward_distributed",
    actorId: "system",
    targetId: "platform_treasury",
    timestamp: Date.now(),
    metadata: {
      amount: Math.floor(platformFee),
      reason: "platform_fee",
      fulfillmentId: fulfillment._id
    }
  })
  
  // Mark rewards as distributed
  await things.update(fulfillment._id, {
    "properties.rewardsDistributed": true,
    "properties.distributedAt": Date.now()
  })
  
  // Log final contract fulfillment
  await events.log({
    type: "contract_fulfilled",
    actorId: actorId,
    targetId: contract._id,
    timestamp: Date.now(),
    metadata: {
      fulfillmentId: fulfillment._id,
      avgRating,
      reviewCount: reviewers.length,
      totalValueDistributed: actualRewards.tokens
    }
  })
  
  // Update mission tracking
  const missionId = fulfillment.properties.missionId
  await events.log({
    type: "mission_completed",
    actorId: actorId,
    targetId: missionId,
    timestamp: Date.now(),
    metadata: {
      fulfillmentId: fulfillment._id,
      rating: avgRating
    }
  })
  
  return { actualRewards, actorShare, reviewerShare: perReviewer }
}

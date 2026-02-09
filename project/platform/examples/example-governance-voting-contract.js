// ============================================================================
// GOVERNANCE VOTING AS SMART CONTRACT WORKFLOW
// ============================================================================

// Step 1: Create proposal and voting contract
async function createGovernanceProposal({
  title,
  description,
  proposalType,
  motivation,
  specification
}: ProposalDetails) {
  
  // Create voting contract
  const votingContract = await things.create({
    groupId: "futures_edge_org",
    type: "action_contract",
    name: `Vote on: ${title}`,
    properties: {
      contractType: "governance_vote",
      title: `Cast vote on "${title}"`,
      description: "Participate in democratic decision-making",
      
      // Who can vote
      eligibility: {
        minTrustScore: 50, // Must be established member
        requiredRank: ["member", "senior", "elder"], // Not recruits
        maxActiveContracts: 999 // No limit on voting
      },
      
      // What "work" is required (reading and voting)
      requirements: {
        action: "Read proposal and cast informed vote",
        deliverables: ["Vote (for/against/abstain)", "Optional: Reasoning"],
        constraints: {
          mustReadProposal: true,
          oneVoteOnly: true
        }
      },
      
      // Proof is automatic (vote record)
      requiredProof: {
        proofTypes: ["vote_record"],
        autoVerify: true
      },
      
      // Value of participating in governance
      valueGenerated: {
        organizationalValue: {
          democraticParticipation: 1,
          governanceEngagement: 1
        },
        individualValue: {
          gratitudePoints: 5, // Base participation reward
          trustPoints: 2, // Small trust boost for civic duty
          leadershipScore: 1
        }
      },
      
      // All rewards go to voters
      rewardDistribution: {
        actor: 1.0 // 100% to voter
      },
      
      // Voting window
      validityPeriod: {
        startDate: Date.now() + 24 * 60 * 60 * 1000, // Starts in 24h (discussion period)
        endDate: Date.now() + 8 * 24 * 60 * 60 * 1000, // Ends in 8 days (7-day voting)
        maxFulfillments: 10000 // All eligible members can vote
      },
      
      status: "active",
      createdBy: "proposer_id"
    }
  })
  
  // Create governance proposal
  const proposal = await things.create({
    groupId: "futures_edge_org",
    type: "governance_proposal",
    name: title,
    properties: {
      title,
      description,
      proposalType,
      
      motivation,
      specification,
      implementation: "", // To be filled in if passed
      
      proposerId: "proposer_id",
      coSponsors: [],
      
      votingPeriod: {
        startDate: votingContract.properties.validityPeriod.startDate,
        endDate: votingContract.properties.validityPeriod.endDate
      },
      
      quorumRequired: 0.20, // 20% of eligible voters must participate
      approvalThreshold: 0.51, // 51% approval needed
      
      voterEligibility: votingContract.properties.eligibility,
      
      votes: {
        for: 0,
        against: 0,
        abstain: 0
      },
      totalVotes: 0,
      quorumMet: false,
      passed: null,
      
      votingContractId: votingContract._id,
      
      implementationStatus: "pending",
      
      status: "open_for_discussion",
      createdAt: Date.now()
    }
  })
  
  // Link proposal to contract
  await connections.create({
    fromEntityId: proposal._id,
    toEntityId: votingContract._id,
    relationshipType: "backed_by_contract"
  })
  
  // Log creation
  await events.log({
    type: "proposal_created",
    actorId: "proposer_id",
    targetId: proposal._id,
    timestamp: Date.now(),
    metadata: {
      proposalType,
      votingContractId: votingContract._id,
      discussionPeriodDays: 1,
      votingPeriodDays: 7
    }
  })
  
  return { proposal, votingContract }
}

// Step 2: Member votes on proposal (fulfills voting contract)
async function castVote(
  memberId: string,
  proposalId: string,
  voteChoice: "for" | "against" | "abstain",
  reason?: string
) {
  
  const proposal = await things.get(proposalId)
  const votingContract = await things.get(proposal.properties.votingContractId)
  const member = await things.get(memberId)
  
  // Check if voting is open
  if (Date.now() < votingContract.properties.validityPeriod.startDate) {
    throw new Error("Voting has not started yet")
  }
  if (Date.now() > votingContract.properties.validityPeriod.endDate) {
    throw new Error("Voting period has ended")
  }
  
  // Check eligibility
  if (member.properties.trustScore < votingContract.properties.eligibility.minTrustScore) {
    throw new Error("Insufficient trust score to vote")
  }
  
  // Check if already voted
  const existingVote = await db.query("things")
    .filter(q => 
      q.eq(q.field("type"), "vote") &&
      q.eq(q.field("properties.proposalId"), proposalId) &&
      q.eq(q.field("properties.voterId"), memberId)
    )
    .first()
  
  if (existingVote) {
    throw new Error("Already voted on this proposal")
  }
  
  // Calculate voting power (could be based on trust score)
  const votingPower = calculateVotingPower(member)
  
  // Create vote record (serves as proof)
  const vote = await things.create({
    groupId: member.groupId,
    type: "vote",
    name: `Vote: ${member.properties.displayName} on ${proposal.name}`,
    properties: {
      proposalId,
      voterId: memberId,
      
      vote: voteChoice,
      reason: reason || "",
      votingPower,
      
      timestamp: Date.now()
    }
  })
  
  // Create contract fulfillment
  const fulfillment = await things.create({
    groupId: member.groupId,
    type: "contract_fulfillment",
    name: `Voted on: ${proposal.name}`,
    properties: {
      contractId: votingContract._id,
      actorId: memberId,
      
      acceptedAt: Date.now(),
      submittedAt: Date.now(), // Instant
      
      proofSubmitted: [{
        proofId: vote._id,
        proofType: "vote_record",
        submittedAt: Date.now()
      }],
      
      verificationStatus: "approved", // Auto-approved
      verifiedAt: Date.now(),
      
      valueAwarded: votingContract.properties.valueGenerated.individualValue,
      rewardsDistributed: false
    }
  })
  
  // Link fulfillment to contract
  await connections.create({
    fromEntityId: fulfillment._id,
    toEntityId: votingContract._id,
    relationshipType: "fulfills"
  })
  
  // Link vote to proposal
  await connections.create({
    fromEntityId: memberId,
    toEntityId: proposalId,
    relationshipType: "voted_on",
    metadata: {
      vote: voteChoice,
      votingPower,
      votedAt: Date.now(),
      voteId: vote._id
    }
  })
  
  // Update proposal vote counts
  await things.update(proposalId, {
    [`properties.votes.${voteChoice}`]: proposal.properties.votes[voteChoice] + votingPower,
    "properties.totalVotes": proposal.properties.totalVotes + votingPower
  })
  
  // Distribute rewards immediately
  await connections.create({
    fromEntityId: fulfillment._id,
    toEntityId: memberId,
    relationshipType: "awarded_to",
    metadata: {
      gratitudePoints: 5,
      trustPoints: 2,
      leadershipScore: 1,
      role: "voter",
      distributedAt: Date.now()
    }
  })
  
  await things.update(memberId, {
    "properties.gratitudePoints": member.properties.gratitudePoints + 5,
    "properties.trustScore": member.properties.trustScore + 2,
    "properties.leadershipScore": member.properties.leadershipScore + 1
  })
  
  await things.update(fulfillment._id, {
    "properties.rewardsDistributed": true,
    "properties.distributedAt": Date.now()
  })
  
  // Log events
  await events.log({
    type: "vote_cast",
    actorId: memberId,
    targetId: proposalId,
    timestamp: Date.now(),
    metadata: {
      vote: voteChoice,
      votingPower,
      voteId: vote._id,
      fulfillmentId: fulfillment._id
    }
  })
  
  await events.log({
    type: "reward_distributed",
    actorId: "system",
    targetId: memberId,
    timestamp: Date.now(),
    metadata: {
      gratitudePoints: 5,
      trustPoints: 2,
      leadershipScore: 1,
      reason: "governance_participation",
      proposalId
    }
  })
  
  // Check if quorum reached and voting period ended
  await checkProposalOutcome(proposalId)
  
  return { vote, fulfillment, votingPower }
}

// Step 3: Finalize proposal when voting ends
async function checkProposalOutcome(proposalId: string) {
  
  const proposal = await things.get(proposalId)
  const votingContract = await things.get(proposal.properties.votingContractId)
  
  // Check if voting period ended
  if (Date.now() < votingContract.properties.validityPeriod.endDate) {
    return { status: "voting_ongoing" }
  }
  
  // Calculate outcome
  const totalEligibleVoters = await countEligibleVoters(votingContract.properties.eligibility)
  const turnoutPercentage = proposal.properties.totalVotes / totalEligibleVoters
  const quorumMet = turnoutPercentage >= proposal.properties.quorumRequired
  
  const approvalPercentage = proposal.properties.votes.for / 
    (proposal.properties.votes.for + proposal.properties.votes.against)
  
  const passed = quorumMet && (approvalPercentage >= proposal.properties.approvalThreshold)
  
  // Update proposal
  await things.update(proposalId, {
    "properties.quorumMet": quorumMet,
    "properties.passed": passed,
    "properties.status": passed ? "passed" : "rejected"
  })
  
  // Log outcome
  await events.log({
    type: passed ? "proposal_passed" : "proposal_rejected",
    actorId: "system",
    targetId: proposalId,
    timestamp: Date.now(),
    metadata: {
      turnoutPercentage,
      approvalPercentage,
      quorumMet,
      totalVotes: proposal.properties.totalVotes,
      votesFor: proposal.properties.votes.for,
      votesAgainst: proposal.properties.votes.against,
      votesAbstain: proposal.properties.votes.abstain
    }
  })
  
  // Close voting contract
  await things.update(votingContract._id, {
    "properties.status": "fulfilled"
  })
  
  return {
    passed,
    quorumMet,
    turnoutPercentage,
    approvalPercentage
  }
}

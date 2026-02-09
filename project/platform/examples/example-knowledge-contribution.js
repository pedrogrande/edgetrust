// ============================================================================
// KNOWLEDGE CONTRIBUTION AS SMART CONTRACT WORKFLOW
// ============================================================================

// Step 1: Create knowledge contribution contract
async function requestKnowledgeArticle(topic: string, details: any) {
  
  // Create contract
  const knowledgeContract = await things.create({
    groupId: "futures_edge_org",
    type: "action_contract",
    name: `Write Article: ${topic}`,
    properties: {
      contractType: "knowledge_contribution",
      title: `Create knowledge article on ${topic}`,
      description: `Contribute educational content to KnowledgeBank`,
      
      eligibility: {
        minTrustScore: 100, // Must be established
        requiredRank: ["member", "senior", "elder"],
        maxActiveContracts: 5
      },
      
      requirements: {
        action: `Research and write comprehensive article`,
        deliverables: [
          "Well-researched article (1500+ words)",
          "Citations and references",
          "Practical examples",
          "Diagrams or visuals (optional)"
        ],
        constraints: {
          minimumWords: 1500,
          requiresCitations: true,
          requiresExamples: true
        }
      },
      
      requiredProof: {
        proofTypes: ["knowledge_article", "peer_review"],
        minimumReviews: 2,
        reviewThreshold: 4.0, // High quality bar
        autoVerify: false
      },
      
      valueGenerated: {
        organizationalValue: {
          knowledgeAsset: true,
          communityGrowth: 0,
          educationalValue: 1
        },
        individualValue: {
          trustPoints: 75, // Higher than missions
          impactScore: 20,
          tokens: 150,
          skillBadges: ["knowledge_contributor"]
        }
      },
      
      rewardDistribution: {
        actor: 0.85, // 85% to author
        reviewers: 0.10,
        platform: 0.05
      },
      
      validityPeriod: {
        startDate: Date.now(),
        endDate: Date.now() + 60 * 24 * 60 * 60 * 1000, // 60 days
        maxFulfillments: 1 // Only one article needed on this topic
      },
      
      status: "active"
    }
  })
  
  // Log contract creation
  await events.log({
    type: "contract_created",
    actorId: "system",
    targetId: knowledgeContract._id,
    timestamp: Date.now(),
    metadata: {
      contractType: "knowledge_contribution",
      topic,
      expectedReward: 127.5 // tokens (85% of 150)
    }
  })
  
  return knowledgeContract
}

// Step 2: Member writes and submits article
async function submitKnowledgeArticle(
  memberId: string,
  contractId: string,
  article: {
    title: string,
    content: string, // Markdown
    summary: string,
    topics: string[],
    references: string[]
  }
) {
  
  const contract = await things.get(contractId)
  const member = await things.get(memberId)
  
  // Verify eligibility
  if (member.properties.trustScore < contract.properties.eligibility.minTrustScore) {
    throw new Error("Insufficient trust score")
  }
  
  // Create knowledge article (serves as proof)
  const knowledgeArticle = await things.create({
    groupId: member.groupId,
    type: "knowledge_article",
    name: article.title,
    properties: {
      title: article.title,
      slug: slugify(article.title),
      content: article.content,
      summary: article.summary,
      
      category: "guide",
      topics: article.topics,
      difficulty: "intermediate",
      
      sections: extractSections(article.content),
      estimatedReadTime: calculateReadTime(article.content),
      
      authorId: memberId,
      contributors: [],
      
      version: "1.0.0",
      previousVersionId: null,
      
      viewCount: 0,
      helpfulCount: 0,
      references: article.references,
      
      status: "under_review",
      publishedAt: null,
      lastUpdatedAt: Date.now()
    }
  })
  
  // Create contract fulfillment
  const fulfillment = await things.create({
    groupId: member.groupId,
    type: "contract_fulfillment",
    name: `Knowledge Contribution: ${article.title}`,
    properties: {
      contractId: contract._id,
      actorId: memberId,
      
      acceptedAt: Date.now(),
      submittedAt: Date.now(),
      
      proofSubmitted: [{
        proofId: knowledgeArticle._id,
        proofType: "knowledge_article",
        submittedAt: Date.now()
      }],
      
      verificationStatus: "under_review",
      reviews: [],
      
      valueAwarded: null
    }
  })
  
  // Link article to member (authorship)
  await connections.create({
    fromEntityId: memberId,
    toEntityId: knowledgeArticle._id,
    relationshipType: "authored",
    metadata: {
      role: "primary_author",
      contributedAt: Date.now()
    }
  })
  
  // Link fulfillment to contract
  await connections.create({
    fromEntityId: fulfillment._id,
    toEntityId: contract._id,
    relationshipType: "fulfills"
  })
  
  // Link fulfillment to article (proof)
  await connections.create({
    fromEntityId: fulfillment._id,
    toEntityId: knowledgeArticle._id,
    relationshipType: "provides_proof"
  })
  
  // Log events
  await events.log({
    type: "article_created",
    actorId: memberId,
    targetId: knowledgeArticle._id,
    timestamp: Date.now(),
    metadata: {
      wordCount: article.content.split(/\s+/).length,
      topics: article.topics
    }
  })
  
  await events.log({
    type: "proof_submitted",
    actorId: memberId,
    targetId: fulfillment._id,
    timestamp: Date.now(),
    metadata: {
      contractId: contract._id,
      proofType: "knowledge_article",
      articleId: knowledgeArticle._id
    }
  })
  
  // Request expert reviews
  await requestExpertReviews(fulfillment._id, article.topics)
  
  return { knowledgeArticle, fulfillment }
}

// Step 3: Article approved and published (rewards distributed)
async function approveKnowledgeArticle(
  fulfillmentId: string,
  avgRating: number
) {
  
  const fulfillment = await things.get(fulfillmentId)
  const contract = await things.get(fulfillment.properties.contractId)
  const article = await getArticleForFulfillment(fulfillmentId)
  const authorId = fulfillment.properties.actorId
  
  // Calculate rewards (with quality bonus for excellent articles)
  const qualityMultiplier = avgRating >= 4.5 ? 1.3 : 1.0
  const baseRewards = contract.properties.valueGenerated.individualValue
  
  const actualRewards = {
    trustPoints: Math.floor(baseRewards.trustPoints * qualityMultiplier),
    impactScore: Math.floor(baseRewards.impactScore * qualityMultiplier),
    tokens: Math.floor(baseRewards.tokens * qualityMultiplier),
    skillBadges: baseRewards.skillBadges
  }
  
  // Update fulfillment
  await things.update(fulfillment._id, {
    "properties.verificationStatus": "approved",
    "properties.verifiedAt": Date.now(),
    "properties.avgRating": avgRating,
    "properties.valueAwarded": actualRewards
  })
  
  // Publish article
  await things.update(article._id, {
    "properties.status": "published",
    "properties.publishedAt": Date.now()
  })
  
  // Distribute rewards to author
  const authorShare = actualRewards.tokens * contract.properties.rewardDistribution.actor
  
  await connections.create({
    fromEntityId: fulfillment._id,
    toEntityId: authorId,
    relationshipType: "awarded_to",
    metadata: {
      trustPoints: actualRewards.trustPoints,
      impactScore: actualRewards.impactScore,
      tokens: Math.floor(authorShare),
      skillBadges: actualRewards.skillBadges,
      role: "author",
      distributedAt: Date.now()
    }
  })
  
  // Update author
  const author = await things.get(authorId)
  await things.update(authorId, {
    "properties.trustScore": author.properties.trustScore + actualRewards.trustPoints,
    "properties.impactScore": author.properties.impactScore + actualRewards.impactScore,
    "properties.tokenBalance": author.properties.tokenBalance + Math.floor(authorShare),
    "properties.skillBadges": [...new Set([
      ...author.properties.skillBadges,
      ...actualRewards.skillBadges
    ])]
  })
  
  // Log events
  await events.log({
    type: "article_published",
    actorId: authorId,
    targetId: article._id,
    timestamp: Date.now(),
    metadata: {
      avgRating,
      fulfillmentId: fulfillment._id
    }
  })
  
  await events.log({
    type: "contract_fulfilled",
    actorId: authorId,
    targetId: contract._id,
    timestamp: Date.now(),
    metadata: {
      fulfillmentId: fulfillment._id,
      articleId: article._id,
      qualityRating: avgRating,
      valueDistributed: actualRewards
    }
  })
  
  await events.log({
    type: "reward_distributed",
    actorId: "system",
    targetId: authorId,
    timestamp: Date.now(),
    metadata: {
      amount: Math.floor(authorShare),
      trustPoints: actualRewards.trustPoints,
      impactScore: actualRewards.impactScore,
      reason: "knowledge_contribution",
      articleId: article._id
    }
  })
  
  // Ongoing rewards: Every time someone finds article helpful
  // Create passive income contract for author
  await createArticleEngagementContract(article._id, authorId)
  
  return { actualRewards, authorShare }
}

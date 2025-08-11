// Quick test to debug intent classification
const message = "track my order ORD-67890";
const lowerMessage = message.toLowerCase();

const TRACK_ORDER = {
  keywords: ['track', 'status', 'where', 'shipped', 'delivery', 'arrive', 'tracking'],
  patterns: [/track\s+(?:my\s+)?order/i, /order\s+status/i, /where\s+is/i, /track.*ORD/i],
  weight: 0.85
};

console.log('Message:', message);
console.log('Lower message:', lowerMessage);

// Keyword matching
const keywordMatches = TRACK_ORDER.keywords.filter(keyword => 
  lowerMessage.includes(keyword)
);
console.log('Keyword matches:', keywordMatches);
console.log('Keyword score:', (keywordMatches.length / TRACK_ORDER.keywords.length) * 0.6);

// Pattern matching
const patternMatches = TRACK_ORDER.patterns.filter(pattern => 
  pattern.test(message)
);
console.log('Pattern matches:', patternMatches.length);
console.log('Pattern test results:');
TRACK_ORDER.patterns.forEach((pattern, i) => {
  console.log(`Pattern ${i}: ${pattern} -> ${pattern.test(message)}`);
});

console.log('Pattern score:', (patternMatches.length / TRACK_ORDER.patterns.length) * 0.4);

const score = ((keywordMatches.length / TRACK_ORDER.keywords.length) * 0.6 + 
               (patternMatches.length / TRACK_ORDER.patterns.length) * 0.4) * TRACK_ORDER.weight;

console.log('Final score:', score);

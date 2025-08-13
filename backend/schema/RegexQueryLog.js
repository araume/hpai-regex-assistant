import mongoose from 'mongoose';

const RegexQueryLogSchema = new mongoose.Schema(
  {
    instruction: { type: String, required: true },
    examples: { type: [String], default: [] },
    language: { type: String, default: 'javascript' },
    model: { type: String },
    rawResponse: { type: String },
    extracted: {
      regex: { type: String },
      flags: { type: String },
      explanation: { type: String },
      language: { type: String },
      sampleMatches: { type: [String], default: [] },
      sampleNonMatches: { type: [String], default: [] },
      notes: { type: String },
    },
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', index: true },
  },
  { timestamps: true }
);

export const RegexQueryLog = mongoose.models.RegexQueryLog || mongoose.model('RegexQueryLog', RegexQueryLogSchema);



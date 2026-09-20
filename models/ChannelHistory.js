import mongoose from 'mongoose';

const channelHistorySchema = new mongoose.Schema({
  channelId: { type: String, required: true },
  channelTitle: { type: String },
  date: { type: String, required: true }, // 'YYYY-MM-DD' format
  viewCount: { type: Number, default: 0 },
  subscriberCount: { type: Number, default: 0 },
  videoCount: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Unique index: one snapshot per channel per day
channelHistorySchema.index({ channelId: 1, date: 1 }, { unique: true });

// Index for fast queries by channelId
channelHistorySchema.index({ channelId: 1, date: -1 });

const ChannelHistory = mongoose.model('ChannelHistory', channelHistorySchema);
export default ChannelHistory;

import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema({
  channelId: {
    type: String,
    required: true,
    unique: true,
  },
  channelName: {
    type: String,
    required: true,
  },
  thumbnail: {
    type: String,
  },
  subscribers: {
    type: Number,
  },
  searchedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);

export default SearchHistory;

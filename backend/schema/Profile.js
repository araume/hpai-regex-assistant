import mongoose from 'mongoose';

const ProfileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export const Profile = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);



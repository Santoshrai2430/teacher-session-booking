import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Session from '../models/Session';
import { HttpError } from '../utils/HttpError';

export async function createUser(req: Request, res: Response): Promise<void> {
  const { fullName, email, phone } = req.body ?? {};
  if (![fullName, email, phone].every(v => typeof v === 'string' && v.trim())) throw new HttpError(400, 'fullName, email, and phone are required');
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new HttpError(400, 'email must be valid');
  const user = await User.create({ fullName, email: normalizedEmail, phone });
  res.status(201).json({ success: true, data: user });
}

export async function getUserSessions(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid user id');
  const userExists = await User.exists({ _id: id });
  if (!userExists) throw new HttpError(404, 'User not found');
  const now = new Date();
  const result = await Session.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(id) } },
    { $lookup: { from: 'teachers', localField: 'teacherId', foreignField: '_id', as: 'teacher' } },
    { $unwind: { path: '$teacher', preserveNullAndEmptyArrays: true } },
    { $sort: { startTime: 1 } },
    { $facet: {
      upcomingSessions: [ { $match: { status: 'BOOKED', startTime: { $gte: now } } }, { $project: { teacherId: 1, teacher: { fullName: '$teacher.fullName', specialization: '$teacher.specialization' }, startTime: 1, endTime: 1, status: 1, createdAt: 1 } } ],
      completedSessions: [ { $match: { status: 'COMPLETED' } }, { $sort: { completedAt: -1 } }, { $project: { teacherId: 1, teacher: { fullName: '$teacher.fullName', specialization: '$teacher.specialization' }, startTime: 1, endTime: 1, status: 1, completedAt: 1, createdAt: 1 } } ]
    } }
  ]);
  res.status(200).json({ success: true, data: result[0] ?? { upcomingSessions: [], completedSessions: [] } });
}

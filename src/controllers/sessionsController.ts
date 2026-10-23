import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Teacher from '../models/Teacher';
import User from '../models/User';
import Session from '../models/Session';
import { HttpError } from '../utils/HttpError';

export async function createSession(req: Request, res: Response): Promise<void> {
  const { teacherId, startTime, endTime } = req.body ?? {};
  if (!mongoose.isValidObjectId(teacherId)) throw new HttpError(400, 'A valid teacherId is required');
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (!startTime || !endTime || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new HttpError(400, 'startTime and endTime must be valid date/time values');
  if (end <= start) throw new HttpError(400, 'endTime must be greater than startTime');
  if (!(await Teacher.exists({ _id: teacherId }))) throw new HttpError(404, 'Teacher not found');
  const session = await Session.create({ teacherId, startTime: start, endTime: end, status: 'AVAILABLE', userId: null, completedAt: null });
  res.status(201).json({ success: true, data: session });
}

export async function getAvailableSessions(req: Request, res: Response): Promise<void> {
  const raw = req.query.dateTimestamp;
  if (typeof raw !== 'string' || raw.trim() === '') throw new HttpError(400, 'dateTimestamp query parameter is required');
  const timestamp = Number(raw);
  if (!Number.isFinite(timestamp) || !Number.isSafeInteger(timestamp)) throw new HttpError(400, 'dateTimestamp must be a valid Unix timestamp in milliseconds');
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, 'dateTimestamp is outside the supported date range');
  const dayStart = new Date(date); dayStart.setUTCHours(0, 0, 0, 0);
  const nextDay = new Date(dayStart); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const sessions = await Session.aggregate([
    { $match: { status: 'AVAILABLE', startTime: { $gte: dayStart, $lt: nextDay } } },
    { $lookup: { from: 'teachers', localField: 'teacherId', foreignField: '_id', as: 'teacher' } },
    { $unwind: '$teacher' },
    { $sort: { startTime: 1 } },
    { $project: { teacherId: 1, teacher: { fullName: '$teacher.fullName', specialization: '$teacher.specialization', experience: '$teacher.experience' }, startTime: 1, endTime: 1, status: 1, createdAt: 1 } }
  ]);
  res.status(200).json({ success: true, count: sessions.length, data: sessions, dateRange: { start: dayStart, endExclusive: nextDay, timezone: 'UTC' } });
}

export async function bookSession(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { userId } = req.body ?? {};
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid session id');
  if (!mongoose.isValidObjectId(userId)) throw new HttpError(400, 'A valid userId is required in request body');
  if (!(await User.exists({ _id: userId }))) throw new HttpError(404, 'User not found');
  // Conditional update prevents two concurrent requests from booking the same session.
  const session = await Session.findOneAndUpdate({ _id: id, status: 'AVAILABLE' }, { $set: { status: 'BOOKED', userId } }, { new: true, runValidators: true });
  if (session) { res.status(200).json({ success: true, message: 'Session booked successfully', data: session }); return; }
  if (!(await Session.exists({ _id: id }))) throw new HttpError(404, 'Session not found');
  throw new HttpError(409, 'Session is not available for booking');
}

export async function completeSession(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid session id');
  const session = await Session.findOneAndUpdate({ _id: id, status: 'BOOKED' }, { $set: { status: 'COMPLETED', completedAt: new Date() } }, { new: true, runValidators: true });
  if (session) { res.status(200).json({ success: true, message: 'Session marked as completed', data: session }); return; }
  if (!(await Session.exists({ _id: id }))) throw new HttpError(404, 'Session not found');
  throw new HttpError(409, 'Only booked sessions can be marked as completed');
}

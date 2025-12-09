// =============================================================================
// User Read Service (MongoDB Projections)
// =============================================================================
// Service pour mettre à jour les Read Models MongoDB pour les utilisateurs
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserRead } from '../schemas/user-read.schema';

@Injectable()
export class UserReadService {
  private readonly logger = new Logger(UserReadService.name);

  constructor(@InjectModel(UserRead.name) private userModel: Model<UserRead>) {}

  async createUser(data: {
    userId: string;
    email: string;
    companyName: string;
    role: string;
  }): Promise<void> {
    await this.userModel.create({
      userId: data.userId,
      email: data.email,
      companyName: data.companyName,
      role: data.role,
      isActive: true,
    });
    this.logger.log(`User projection created: ${data.userId}`);
  }

  async findById(userId: string): Promise<UserRead | null> {
    return this.userModel.findOne({ userId }).exec();
  }

  async incrementTotalOrders(userId: string): Promise<void> {
    await this.userModel.updateOne(
      { userId },
      { $inc: { totalOrders: 1 }, $set: { lastActivityAt: new Date() } },
    );
  }

  async incrementTotalParts(userId: string): Promise<void> {
    await this.userModel.updateOne({ userId }, { $inc: { totalParts: 1 } });
  }
}

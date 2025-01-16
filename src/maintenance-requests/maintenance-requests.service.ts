import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { nanoid } from '../common/nanoid';
import { DatabaseService } from '../database/database.service';
import getKey from '../utils/get-key';
import { CreateMaintenanceRequestDto, EditMaintenanceRequestDto } from './dto';
import getDel from '../utils/get-delete';
import { ApartmentsService } from '../apartments/apartments.service';
import { clean } from '../common/clean';
import { MAINTENANCE_STATUS } from '@prisma/client';

@Injectable()
export class MaintenanceRequestsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly apartmentsService: ApartmentsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(userId: string, args: CreateMaintenanceRequestDto) {
    try {
      const apartments = await this.apartmentsService.findManyByTenant(
        userId,
        0,
        1,
      );

      if (!apartments.results.length) {
        throw new InternalServerErrorException('You do not have an apartment');
      }

      await this.databaseService.maintenanceRequests.create({
        data: {
          description: args.description,
          preferredDate: args.preferredDate,
          urgency: args.urgency,
          ticketId: nanoid(6),
          attachments: args.attachments,
          status: 'PENDING',
          userId,
          landlordId: apartments.results[0].userId,
          tenantId: apartments.results[0].tenants.find(
            (t) => t.userId === userId,
          ).id,
          apartmentId: apartments.results[0].id,
        },
      });

      await this.resetCache();

      return { message: 'Maintenance request created' };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(
    userId: string,
    offset: number,
    limit: number,
    search: string,
    status: string,
    date: string,
  ) {
    try {
      const cacheKey = getKey('maintenances', {
        userId,
        offset,
        limit,
        search,
        status,
        date,
      });

      const cache = await this.cacheManager.get(cacheKey);

      if (cache) return cache;

      const where = clean({
        userId,
        status: status ? { in: [MAINTENANCE_STATUS[status]] } : null,
        createdAt: date ? this.formatDateRange(date) : null,
      });

      const maintenanceRequests =
        await this.databaseService.maintenanceRequests.findMany({
          where,
          skip: offset,
          take: limit,
        });

      const totalItems = await this.databaseService.maintenanceRequests.count({
        where,
      });
      const data = { totalItems, results: maintenanceRequests };

      await this.cacheManager.set(cacheKey, data, 3600);

      return data;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findOne(userId: string, id: string) {
    try {
      const cacheKey = getKey('maintenance', { userId, id });

      const cache = await this.cacheManager.get(cacheKey);

      if (cache) return cache;

      const maintenanceRequest =
        await this.databaseService.maintenanceRequests.findUnique({
          where: { id, userId },
        });

      await this.cacheManager.set(cacheKey, maintenanceRequest, 3600);

      return maintenanceRequest;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async edit(userId: string, id: string, args: EditMaintenanceRequestDto) {
    try {
      const maintenanceRequest =
        await this.databaseService.maintenanceRequests.findFirst({
          where: { id, userId },
        });

      if (!maintenanceRequest) {
        throw new InternalServerErrorException('Maintenance request not found');
      }

      await this.databaseService.maintenanceRequests.update({
        where: { id, userId },
        data: clean({
          description: args.description,
          preferredDate: args.preferredDate,
          urgency: args.urgency,
          attachments: args.attachments,
        }),
      });

      await this.resetCache();

      return {
        message: `Maintenance Request updated successfully`,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(userId: string, id: string) {
    try {
      await this.databaseService.maintenanceRequests.delete({
        where: { id, userId },
      });

      await this.resetCache();

      return {
        message: `Maintenance Request with id #${id} deleted successfully`,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async landlordOverview(userId: string) {
    const [] = await Promise.all([
      await this.databaseService.maintenanceRequests.count({
        where: { userId },
      }),
      await this.databaseService.maintenanceRequests.count({
        where: { userId, status: 'PENDING' },
      }),
      await this.databaseService.maintenanceRequests.count({
        where: { userId, status: 'RESOLVED' },
      }),
      await this.databaseService.maintenanceRequests.count({
        where: { userId, status: 'CANCELED' },
      }),
    ]);
  }

  private async resetCache() {
    await getDel(this.cacheManager, ['maintenances*', 'maintenance*']);
  }

  private formatDateRange(date: string) {
    const [from, to] = date.split('-').map((d) => d.split(':')[1]);

    return { gte: new Date(from), lte: new Date(to) };
  }
}

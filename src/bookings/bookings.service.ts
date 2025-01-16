import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { DatabaseService } from '../database/database.service';
import getKey from '../utils/get-key';
import { CreateBookingDto, EditBookingDto } from './dto';
import getDel from '../utils/get-delete';
import { APARTMENT_BOOKINGS_STATUS, INSPECTION_TYPE } from '@prisma/client';
import { clean } from '../common/clean';

@Injectable()
export class BookingsService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(userId: string, args: CreateBookingDto) {
    try {
      await this.databaseService.apartmentBookings.create({
        data: {
          apartmentId: args.apartmentId,
          status: 'PENDING',
          inspectionDate: args.inspectionDate,
          inspectionType: INSPECTION_TYPE[args.inspectionType],
          userId,
        },
      });

      await this.resetCache();

      return { message: 'Booking created' };
    } catch (error: any) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(
    userId: string,
    offset: number,
    limit: number,
    status: string,
    search: string,
    date: string,
  ) {
    try {
      const cacheKey = getKey('bookings', {
        userId,
        offset,
        limit,
        status,
        search,
        date,
      });

      const cache = await this.cacheManager.get(cacheKey);

      if (cache) return cache;

      const where = clean({
        userId,
        apartment: search ? { name: { contains: search } } : null,
        status: status ? { in: [APARTMENT_BOOKINGS_STATUS[status]] } : null,
        createdAt: date ? this.formatDateRange(date) : null,
      });

      const apartmentBookings =
        await this.databaseService.apartmentBookings.findMany({
          where,
          include: {
            apartment: {
              include: {
                pricing: true,
                location: true,
                bookingOptions: true,
                apartmentBookings: true,
              },
            },
          },
          skip: offset,
          take: limit,
        });

      const totalItems = await this.databaseService.apartmentBookings.count({
        where,
      });

      const data = { totalItems, results: apartmentBookings };

      await this.cacheManager.set(cacheKey, data, 3600);

      return data;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findOne(userId: string, id: string) {
    try {
      const cacheKey = getKey('booking', { id, userId });

      const cache = await this.cacheManager.get(cacheKey);

      if (cache) return cache;

      const apartmentBookings =
        await this.databaseService.apartmentBookings.findUnique({
          where: { id, userId },
          include: {
            apartment: {
              include: {
                pricing: true,
              },
            },
          },
        });

      return apartmentBookings;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async edit(userId: string, id: string, args: EditBookingDto) {
    try {
      const booking = await this.databaseService.apartmentBookings.findFirst({
        where: { id, userId },
      });

      if (!booking) {
        throw new InternalServerErrorException('Booking not found');
      }

      await this.databaseService.apartmentBookings.update({
        where: { id, userId },
        data: clean({
          inspectionDate: args.inspectionDate,
          inspectionType: args.inspectionType
            ? INSPECTION_TYPE[args.inspectionType]
            : null,
        }),
      });

      await this.resetCache();
      return {
        message: `Apartment Booking updated successfully`,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(userId: string, id: string) {
    try {
      await this.databaseService.apartmentBookings.delete({
        where: { id, userId },
      });

      await this.resetCache();

      return {
        message: `Apartment Booking with id #${id} deleted successfully`,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  private async resetCache() {
    await getDel(this.cacheManager, ['bookings*', 'booking*']);
  }

  private formatDateRange(date: string) {
    const [from, to] = date.split('-').map((d) => d.split(':')[1]);

    return { gte: new Date(from), lte: new Date(to) };
  }
}

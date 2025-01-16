import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { clean } from '../common/clean';
import getKey from '../utils/get-key';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  MAINTENANCE_STATUS,
  MAINTENANCE_URGENCY,
  WITHDRAWAL_STATUS,
} from '@prisma/client';
import {
  AddBankDetailsDto,
  CreateWalletDto,
  CreateWithdrawalRequestDto,
} from './dto';
import * as bcrypt from 'bcrypt';
import getDel from '../utils/get-delete';

@Injectable()
export class LandlordService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getOverview(userId: string) {
    const apartments = await this.databaseService.apartments.findMany({
      where: { userId, AND: { isDeleted: false } },
      include: {
        tenants: true,
      },
    });

    const totalProperties = apartments.reduce((acc, curr) => {
      return acc + curr.totalUnit;
    }, 0);
    const availableUnits = apartments.reduce((acc, curr) => {
      return acc + curr.avaliableUnits;
    }, 0);

    const tenants = apartments.reduce((acc, curr) => {
      return acc + curr.tenants.length;
    }, 0);

    const data = {
      properties: totalProperties,
      vacant: availableUnits,
      occupied: totalProperties - availableUnits,
      tenants,
    };

    return data;
  }

  async fetchTenants(
    userId: string,
    offset: number,
    limit: number,
    search: string,
  ) {
    const where = clean({
      Apartments: { userId },
      user: search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : null,
    });

    const tenants = await this.databaseService.tenant.findMany({
      where,
      select: {
        id: true,
        rentPrice: true,
        Apartments: {
          select: {
            name: true,
            apartmentType: true,
          },
        },
        user: {
          select: {
            lastName: true,
            firstName: true,
          },
        },
      },
      skip: offset,
      take: limit,
    });

    const totalItems = await this.databaseService.tenant.count({ where });

    const data = {
      totalItems,
      results: tenants.map((tenant) => ({
        id: tenant.id,
        name: `${tenant.user.firstName} ${tenant.user.lastName}`,
        apartmentName: tenant.Apartments.name,
        apartmentType: tenant.Apartments.apartmentType,
        rentPrice: tenant.rentPrice.total,
      })),
    };

    return data;
  }

  async findAllMaintenance(
    userId: string,
    offset: number,
    limit: number,
    status: string,
    urgency: string,
  ) {
    try {
      const cacheKey = getKey('maintenances', {
        userId,
        offset,
        limit,
        status,
        urgency,
      });

      const cache = await this.cacheManager.get(cacheKey);

      if (cache) return cache;

      const where = clean({
        landlordId: userId,
        status: status ? { in: [MAINTENANCE_STATUS[status]] } : null,
        urgency: urgency ? { in: [MAINTENANCE_URGENCY[urgency]] } : null,
      });

      const maintenanceRequests =
        await this.databaseService.maintenanceRequests.findMany({
          where,
          skip: offset,
          take: limit,
        });

      const apartments = await Promise.all(
        maintenanceRequests.map((request) =>
          this.databaseService.apartments.findFirst({
            where: { id: request.apartmentId },
            select: {
              id: true,
              name: true,
              location: true,
              apartmentType: true,
            },
          }),
        ),
      );

      const users = await Promise.all(
        maintenanceRequests.map((request) =>
          this.databaseService.user.findFirst({
            where: { id: request.userId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoURL: true,
            },
          }),
        ),
      );

      const results = maintenanceRequests.map((request) => ({
        ...request,
        apartment: apartments.find(
          (apartment) => apartment.id === request.apartmentId,
        ),
        user: users.find((user) => user.id === request.userId),
      }));

      const totalItems = await this.databaseService.maintenanceRequests.count({
        where,
      });
      const data = { totalItems, results };

      await this.cacheManager.set(cacheKey, data, 3600);

      return data;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async fetchMaintenanceOverview(userId: string) {
    const [totalRequest, pendingRequest, resolvedRequest, deletedRequest] =
      await Promise.all([
        await this.databaseService.maintenanceRequests.count({
          where: { landlordId: userId },
        }),
        await this.databaseService.maintenanceRequests.count({
          where: { landlordId: userId, status: MAINTENANCE_STATUS.PENDING },
        }),
        await this.databaseService.maintenanceRequests.count({
          where: { landlordId: userId, status: MAINTENANCE_STATUS.RESOLVED },
        }),
        await this.databaseService.maintenanceRequests.count({
          where: { landlordId: userId, status: MAINTENANCE_STATUS.CANCELED },
        }),
      ]);

    const data = {
      totalRequest,
      pendingRequest,
      resolvedRequest,
      deletedRequest,
    };

    return data;
  }

  async approveMaintenanceRequest(requestId: string) {
    const request = await this.databaseService.maintenanceRequests.findFirst({
      where: { id: requestId },
    });

    if (!request) {
      throw new InternalServerErrorException('Maintenance requests not found');
    }

    await this.databaseService.maintenanceRequests.update({
      where: { id: requestId },
      data: { status: MAINTENANCE_STATUS.APPROVED },
    });

    return { message: 'Request approved successfully' };
  }

  async cancelMaintenanceRequest(requestId: string) {
    const request = await this.databaseService.maintenanceRequests.findFirst({
      where: { id: requestId },
    });

    if (!request) {
      throw new InternalServerErrorException('Maintenance requests not found');
    }

    await this.databaseService.maintenanceRequests.update({
      where: { id: requestId },
      data: { status: MAINTENANCE_STATUS.CANCELED },
    });

    return { message: 'Request cancel successfully' };
  }

  async walletOverview(userId: string) {
    const [pending, outflow, payments] = await Promise.all([
      await this.databaseService.withdrawalHistory.findMany({
        where: { userId, status: 'PENDING' },
        select: { amount: true },
      }),
      await this.databaseService.withdrawalHistory.findMany({
        where: { userId, status: 'SUCCESS' },
        select: { amount: true },
      }),
      await this.databaseService.apartments.findMany({
        where: { userId, tenants: { some: {} } },
        select: {
          tenants: {
            select: {
              payment: { select: { amount: true } },
            },
          },
        },
      }),
    ]);

    const totalPending = pending.reduce((acc, curr) => acc + curr.amount, 0);
    const totalOutflow = outflow.reduce((acc, curr) => acc + curr.amount, 0);

    const totalInflow = payments.reduce((acc, curr) => {
      return (
        acc +
        curr.tenants.reduce((acc, curr) => {
          return (
            acc +
            curr.payment.reduce((acc, curr) => {
              return acc + curr.amount;
            }, 0)
          );
        }, 0)
      );
    }, 0);

    return {
      pending: totalPending,
      inflow: totalInflow,
      outflow: totalOutflow,
    };
  }

  async createWallet(userId: string, dto: CreateWalletDto) {
    const { accountNumber, bankName, accountName, pin } = dto;

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(pin, salt);

    await this.databaseService.wallet.create({
      data: {
        userId,
        bankDetails: {
          create: {
            accountNumber,
            bankName,
            accountName,
          },
        },
        withdrawalPin: hash,
      },
    });

    return { message: 'Wallet created successfully' };
  }

  async addBankDetails(userId: string, dto: AddBankDetailsDto) {
    const { accountNumber, bankName, accountName } = dto;

    const wallet = await this.databaseService.wallet.findFirst({
      where: { userId },
      include: { bankDetails: true },
    });

    if (!wallet) {
      throw new InternalServerErrorException('Wallet not found');
    }

    if (wallet.bankDetails.length === 2) {
      throw new InternalServerErrorException(
        'You can only add two bank details',
      );
    }

    await this.databaseService.wallet.update({
      where: { userId },
      data: {
        bankDetails: {
          create: {
            accountNumber,
            bankName,
            accountName,
          },
        },
      },
    });

    return { message: 'Bank details added successfully' };
  }

  async removeBankDetails(userId: string, walletId: string, bankId: string) {
    const wallet = await this.databaseService.wallet.findFirst({
      where: { id: walletId, userId },
      include: { bankDetails: true },
    });

    if (!wallet) {
      throw new InternalServerErrorException('Wallet not found');
    }

    await this.databaseService.bankDetails.delete({
      where: { id: bankId },
    });

    return { message: 'Bank details removed successfully' };
  }

  async verifyWalletPin(userId: string, pin: string) {
    const wallet = await this.databaseService.wallet.findFirst({
      where: { userId },
    });

    if (!wallet) {
      throw new InternalServerErrorException('Wallet not found');
    }

    const isMatch = await bcrypt.compare(pin, wallet.withdrawalPin);

    if (!isMatch) {
      throw new InternalServerErrorException('Invalid pin');
    }

    return { message: 'Pin verified successfully', success: true };
  }

  async fetchWallet(userId: string) {
    const wallet = await this.databaseService.wallet.findFirst({
      where: { userId },
      select: {
        id: true,
        bankDetails: true,
        createdAt: true,
        updatedAt: true,
        history: true,
        userId: true,
      },
    });

    if (!wallet) {
      return null;
    }

    return wallet;
  }

  async fetchWithdrawalHistory(
    userId: string,
    offset: number,
    limit: number,
    status: string,
    date: string,
  ) {
    const where = clean({
      userId,
      status: status ? { in: [WITHDRAWAL_STATUS[status]] } : null,
      createdAt: date ? this.formatDateRange(date) : null,
    });

    const history = await this.databaseService.withdrawalHistory.findMany({
      where,
      skip: offset,
      take: limit,
    });

    const totalItems = await this.databaseService.withdrawalHistory.count({
      where,
    });

    const data = { totalItems, results: history };

    return data;
  }

  async createWithdrawalRequest(
    userId: string,
    dto: CreateWithdrawalRequestDto,
  ) {
    await this.fetchWallet(userId);

    const res = await this.verifyWalletPin(userId, dto.pin);

    if (!res.success) {
      throw new InternalServerErrorException('Uh oh! Something went wrong');
    }

    await this.databaseService.wallet.update({
      where: { userId },
      data: {
        history: {
          create: {
            amount: dto.amount,
            type: 'withdrawal',
            status: WITHDRAWAL_STATUS.PENDING,
            description: dto.description,
            userId,
          },
        },
      },
    });

    return { message: 'Withdrawal request created successfully' };
  }

  async archiveApartment(apartmentId: string) {
    await this.databaseService.apartments.update({
      where: { id: apartmentId },
      data: { archived: true },
    });
    await getDel(this.cacheManager, [
      'apartments*',
      'properties*',
      'apartments-similar*',
      'apartment*',
      'apartments-by-ids*',
    ]);

    return { message: 'Apartment archived successfully' };
  }

  async deleteApartment(apartmentId: string) {
    await this.databaseService.apartments.update({
      where: { id: apartmentId },
      data: { isDeleted: true },
    });

    await getDel(this.cacheManager, [
      'apartments*',
      'properties*',
      'apartments-similar*',
      'apartment*',
      'apartments-by-ids*',
    ]);

    return { message: 'Apartment deleted successfully' };
  }

  private formatDateRange(date: string) {
    const [from, to] = date.split('-').map((d) => d.split(':')[1]);

    return { gte: new Date(from), lte: new Date(to) };
  }
}

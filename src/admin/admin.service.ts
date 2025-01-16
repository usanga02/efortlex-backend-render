import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MAINTENANCE_STATUS, ROLE, WITHDRAWAL_STATUS } from '@prisma/client';
import { FindAllUsersArgs } from './types';
import { clean } from '../common/clean';

@Injectable()
export class AdminService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAllUsers(args: FindAllUsersArgs) {
    const { role, offset, limit, search } = args;

    const where = clean({
      role: role ? { has: ROLE[role] } : null,
      OR: search
        ? [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
          ]
        : null,
    });

    const users = await this.databaseService.user.findMany({
      where,
      skip: offset,
      take: limit,
    });

    const results = await Promise.all(
      users.map(async (user) => {
        const landlordStats = await this.getLandlordStats(user.id);
        return { ...user, landlordStats };
      }),
    );

    const totalItems = await this.databaseService.user.count({
      where,
    });

    return { results, totalItems };
  }

  async findUserById(id: string) {
    const user = await this.databaseService.user.findFirst({
      where: { id },
    });

    return user;
  }

  async getLandlordStats(userId: string) {
    const apartments = await this.databaseService.apartments.findMany({
      where: { userId },
    });

    return {
      totalProperties: apartments.length,
      occupied: apartments.reduce((acc, curr) => {
        return acc + (curr.totalUnit - curr.avaliableUnits);
      }, 0),
    };
  }

  async findTotalApartmentsUnit() {
    const apartments = await this.databaseService.apartments.findMany({});

    const availableUnits = apartments.reduce((acc, curr) => {
      return acc + curr.avaliableUnits;
    }, 0);

    const totalProperties = apartments.reduce((acc, curr) => {
      return acc + curr.totalUnit;
    }, 0);

    return { totalProperties, occupied: totalProperties - availableUnits };
  }

  async findLandlordOverview(id: string) {
    const apartments = await this.databaseService.apartments.findMany({
      where: { userId: id, AND: { isDeleted: false } },
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

  async findLandlordUpcomingPayments(
    userId: string,
    offset: number,
    limit: number,
  ) {
    const apartment = await this.databaseService.apartments.findMany({
      where: clean({
        userId,
        tenants: { some: { payment: { some: {} } } },
      }),
      include: {
        tenants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoURL: true,
              },
            },
            payment: {
              take: 1,
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    const results = apartment.flatMap((item) => {
      const tenants = item.tenants.map((tenant) => {
        return {
          name: tenant.user.lastName + ' ' + tenant.user.firstName,
          amount: tenant.payment[0].amount,
          photoURL: tenant.user.photoURL,
          status: this.getPaymentStatus(tenant.payment[0].nextDue),
          apartmentName: item.name,
        };
      });
      return tenants;
    });

    const data = {
      totalItems: results.length,
      results: results.slice(offset, limit),
    };

    return data;
  }

  async findMaintenanceOverview(userId: string) {
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

  async findLandlordApartments(userId: string, offset: number, limit: number) {
    const apartments = await this.databaseService.apartments.findMany({
      where: { userId },
      include: {
        bookingOptions: true,
        pricing: true,
        location: true,
        tenants: true,
      },
      skip: offset,
      take: limit,
    });

    const totalItems = await this.databaseService.apartments.count({
      where: { userId },
    });

    const data = {
      totalItems,
      results: apartments,
    };

    return data;
  }

  async findAllTenants(offset: number, limit: number, search: string) {
    const where = clean({
      OR: search
        ? [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
          ]
        : null,
    });
    const apartment = await this.databaseService.apartments.findMany({
      where: {
        tenants: { some: { user: where } },
      },
      include: {
        tenants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoURL: true,
              },
            },
            payment: {
              take: 1,
              orderBy: {
                createdAt: 'desc',
              },
            },
            rentPrice: {
              select: {
                durationOfRent: true,
                rent: true,
              },
            },
          },
        },
        location: true,
      },
    });

    const results = apartment.flatMap((item) => {
      const tenants = item.tenants.map((tenant) => {
        return {
          id: tenant.id,
          userId: tenant.userId,
          name: tenant.user.lastName + ' ' + tenant.user.firstName,
          photoURL: tenant.user.photoURL,
          rentDetails: {
            status: this.getPaymentStatus(tenant.payment[0].nextDue),
            durationOfRent: tenant.rentPrice.durationOfRent,
            amount: tenant.rentPrice.rent,
            lastPaid: tenant.payment[0].createdAt,
            nextDue: tenant.payment[0].nextDue,
          },
          apartment: {
            name: item.name,
            location: item.location,
            type: item.apartmentType,
          },
          apartmentName: item.name,
        };
      });
      return tenants;
    });

    const data = {
      totalItems: results.length,
      results: results.slice(offset, limit),
    };

    return data;
  }

  async findTenant(id: string) {
    const apartment = await this.databaseService.apartments.findFirst({
      where: {
        tenants: { some: { userId: id } },
      },
      include: {
        tenants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoURL: true,
              },
            },
            payment: {
              take: 1,
              orderBy: {
                createdAt: 'desc',
              },
            },
            rentPrice: {
              select: {
                durationOfRent: true,
                rent: true,
              },
            },
          },
        },
        location: true,
      },
    });

    const tenant = apartment.tenants[0];

    const results = {
      name: tenant.user.lastName + ' ' + tenant.user.firstName,
      photoURL: tenant.user.photoURL,
      rentDetails: {
        status: this.getPaymentStatus(tenant.payment[0].nextDue),
        durationOfRent: tenant.rentPrice.durationOfRent,
        amount: tenant.rentPrice.rent,
        lastPaid: tenant.payment[0].createdAt,
        nextDue: tenant.payment[0].nextDue,
      },
      apartment: {
        name: apartment.name,
        location: apartment.location,
        type: apartment.apartmentType,
      },
      apartmentName: apartment.name,
    };

    return results;
  }

  async findTenantOverview(userId: string) {
    const bookedApartment = await this.databaseService.apartmentBookings.count({
      where: { userId, status: 'SUCCESSFUL' },
    });
    const scheduledApartment =
      await this.databaseService.apartmentBookings.count({
        where: { userId, status: 'SCHEDULED' },
      });
    const maintainanceRequest =
      await this.databaseService.maintenanceRequests.count({
        where: { userId },
      });

    const apartments = await this.databaseService.apartmentRequests.findMany({
      where: { userId },
    });

    const data = {
      bookedApartment,
      scheduledApartment,
      maintainanceRequest,
      apartmentRequest: {
        found: apartments.filter((apartment) => apartment.status === 'FOUND')
          .length,
        inProgress: apartments.filter(
          (apartment) => apartment.status === 'IN_PROGRESS',
        ).length,
        unavailable: apartments.filter(
          (apartment) => apartment.status === 'UNAVAILABLE',
        ).length,
      },
    };

    return data;
  }

  async findManyByTenant(userId: string, offset: number, limit: number) {
    const where = {
      tenants: { some: { userId } },
    };
    const apartments = await this.databaseService.apartments.findMany({
      where,
      include: {
        pricing: true,
        location: true,
        tenants: { select: { id: true, userId: true, payment: true } },
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoURL: true,
          },
        },
      },
      skip: offset,
      take: limit,
    });

    const totalItems = await this.databaseService.apartments.count({ where });

    const data = { results: apartments, totalItems };

    return data;
  }

  async findTenantMaintenanceRequest(
    userId: string,
    offset: number,
    limit: number,
    search: string,
    status: string,
    date: string,
  ) {
    try {
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

      return data;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async fetchWithdrawalHistory(
    offset: number,
    limit: number,
    status: string,
    date: string,
  ) {
    const where = clean({
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

  async fetchWalletBalance() {
    const payments = await this.databaseService.apartments.findMany({
      where: { tenants: { some: {} } },
      select: {
        name: true,
        tenants: {
          select: {
            user: { select: { firstName: true, lastName: true } },
            payment: true,
          },
        },
      },
    });

    const totalBalance = payments.reduce((acc, curr) => {
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

    return { totalBalance };
  }

  async fetchAllApartmentRequest(
    offset: number,
    limit: number,
    search: string,
  ) {
    try {
      const where = clean({
        user: search
          ? {
              OR: [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
              ],
            }
          : null,
      });
      const apartmentRequests =
        await this.databaseService.apartmentRequests.findMany({
          where,
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                photoURL: true,
              },
            },
          },
          skip: offset,
          take: limit,
        });

      const totalItems = await this.databaseService.apartmentRequests.count({
        where,
      });

      const data = {
        totalItems,
        results: apartmentRequests,
      };

      return data;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  private formatDateRange(date: string) {
    const [from, to] = date.split('-').map((d) => d.split(':')[1]);

    return { gte: new Date(from), lte: new Date(to) };
  }

  private getPaymentStatus(nextDueDate: Date) {
    const today = new Date();
    const nextDue = new Date(nextDueDate);
    const diffTime = nextDue.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.ceil(diffDays / 30);
    const diffYears = Math.ceil(diffDays / 365);

    if (diffDays <= 0) {
      return 'overdue';
    } else if (diffYears > 1) {
      return 'In ' + diffYears + ' years';
    } else if (diffMonths > 1) {
      return 'In ' + diffMonths + ' months';
    }

    return 'In ' + diffDays + ' days';
  }
}

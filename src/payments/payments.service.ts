import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApartmentsService } from '../apartments/apartments.service';
import { DatabaseService } from '../database/database.service';
import { User } from '../users/users.type';
import * as paystack from 'paystack';
import { DURATION_OF_RENT } from '@prisma/client';
import { nanoid } from '../common/nanoid';
import { clean } from '../common/clean';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly apartmentService: ApartmentsService,
    private readonly databaseService: DatabaseService,
  ) {}

  async fetchUserPayments(
    userId: string,
    offset: number,
    limit: number,
    date: string,
  ) {
    const where = clean({
      userId,
      createdAt: date ? this.formatDateRange(date) : null,
    });
    const payments = await this.databaseService.payment.findMany({
      where,
      include: {
        Tenant: {
          select: {
            Apartments: {
              select: {
                name: true,
                apartmentType: true,
              },
            },
          },
        },
      },
      skip: offset,
      take: limit,
    });

    const totalItems = await this.databaseService.payment.count({
      where,
    });

    const data = { totalItems, results: payments };

    return data;
  }

  async fetchPaymentsForLandlord(
    userId: string,
    offset: number,
    limit: number,
    isAdmin: boolean = false,
  ) {
    const apartments = await this.databaseService.apartments.findMany({
      where: clean({
        userId: isAdmin ? null : userId,
        tenants: { some: { payment: { some: {} } } },
      }),
      select: {
        name: true,
        tenants: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            payment: {
              select: {
                amount: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    const formattedPayments = apartments.flatMap((item) => {
      const tenants = item.tenants.flatMap((tenant) => {
        const payments = tenant.payment.map((payment) => {
          return {
            apartmentName: item.name,
            name: tenant.user.lastName + ' ' + tenant.user.firstName,
            amount: payment.amount,
            createdAt: payment.createdAt,
          };
        });
        return payments;
      });
      return tenants;
    });

    const data = {
      totalItems: formattedPayments.length,
      results: formattedPayments.slice(offset, limit),
    };

    return data;
  }

  async fetchPaymentStatsForLandlord(
    userId: string,
    period: 'monthly' | 'yearly',
    isAdmin: boolean = false,
  ) {
    const apartments = await this.databaseService.apartments.findMany({
      where: clean({
        userId: isAdmin ? null : userId,
        tenants: { some: { payment: { some: {} } } },
      }),
      select: {
        tenants: {
          select: {
            payment: {
              select: {
                amount: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    const formattedPayments: {
      amount: number;
      createdAt: Date;
    }[] = apartments.flatMap((item) => {
      const tenants = item.tenants.flatMap((tenant) => tenant.payment);
      return tenants;
    });

    const stats = this.calculatePaymentStats(formattedPayments, period);

    return stats;
  }

  async fetchPaymentStatusForAdmin(userId: string) {
    const results = await this.fetchAllUpcomingPayments(userId, true);

    const payments = await this.databaseService.payment.count();

    const overdue = results.filter((item) => item.status === 'overdue').length;

    return {
      upcoming: results.length,
      overdue,
      paid: payments,
    };
  }

  async fetchLandlordWalletBalance(userId: string) {
    const payments = await this.databaseService.apartments.findMany({
      where: { userId, tenants: { some: {} } },
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

  async fetchAllUpcomingPayments(userId: string, isAdmin: boolean = false) {
    const apartment = await this.databaseService.apartments.findMany({
      where: clean({
        userId: isAdmin ? null : userId,
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

    return results;
  }

  async fetchUpcomingPayments(
    userId: string,
    offset: number,
    limit: number,
    isAdmin: boolean = false,
  ) {
    const results = await this.fetchAllUpcomingPayments(userId, isAdmin);

    return {
      totalItems: results.length,
      results: results.slice(offset, limit),
    };
  }

  async fetchUpcomingPaymentsForAdmin(offset: number, limit: number) {
    const apartment = await this.databaseService.apartments.findMany({
      where: { tenants: { some: { payment: { some: {} } } } },
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
    return {
      totalItems: results.length,
      results: results.slice(offset, limit),
    };
  }

  async createRentPayment(
    user: User,
    apartmentId: string,
    bookingId: string,
    type: 'rent' | 'renewal',
  ) {
    const apartment = await this.apartmentService.findOneById(apartmentId);
    const tenant = await this.databaseService.tenant.findFirst({
      where: { userId: user.id, Apartments: { id: apartmentId } },
      select: { rentPrice: true },
    });

    const payment = await this.databaseService.tenant.findFirst({
      where: {
        userId: user.id,
        apartmentsId: {
          in: [apartmentId],
        },
      },
    });

    const paystackInstance = paystack(
      this.configService.get('PAYSTACK_SECRET_KEY'),
    );

    const id = nanoid(10);

    const amount =
      (type === 'rent'
        ? payment
          ? apartment.pricing.rent
          : apartment.pricing.total
        : tenant.rentPrice.rent) * 100;

    const res = await paystackInstance.transaction.initialize({
      amount,
      email: user.email,
      reference: id,
      phone: user.phoneNumber,
      // callback_url: `${process.env.BASE_URL}/events/purchase/${slug}/success`,
      name: `${user.lastName} ${user.firstName}`,
      metadata: {
        custom_fields: [
          {
            display_name: 'User Id',
            variable_name: 'userId',
            value: user.id,
          },
          {
            display_name: 'Landlord Id',
            variable_name: 'landlordId',
            value: apartment.userId,
          },
          {
            display_name: 'Payment Id',
            variable_name: 'paymentId',
            value: id,
          },
          {
            display_name: 'Apartment Id',
            variable_name: 'apartmentId',
            value: apartmentId,
          },
          {
            display_name: 'Booking Id',
            variable_name: 'bookingId',
            value: bookingId,
          },
          {
            display_name: 'Purpose',
            variable_name: 'purpose',
            value: type,
          },
          {
            display_name: 'Amount',
            variable_name: 'amount',
            value: amount / 100,
          },
        ],
      },
    });

    return { paymentUrl: res.data.authorization_url };
  }

  async webhook(body: any) {
    if (body.event !== 'charge.success')
      return new ConflictException('Payment failed');

    const custom_fields = body.data.metadata.custom_fields as any[];
    const metadata = custom_fields.reduce((acc, item) => {
      acc[item.variable_name] = item.value;
      return acc;
    }, {});

    if (metadata.purpose === 'rent') {
      this.createOrUpdateTenantPayment(metadata);
    }
    if (metadata.purpose === 'maintenance') {
    }
  }

  async createOrUpdateTenantPayment(metadata: any) {
    const apartment = await this.databaseService.apartments.findFirst({
      where: { id: metadata.apartmentId },
      include: { pricing: true },
    });

    const pricing = apartment.pricing;

    const [tenant] = await Promise.all([
      await this.databaseService.tenant.findFirst({
        where: {
          userId: metadata.userId,
          apartmentsId: metadata.apartmentId,
        },
      }),
      await this.databaseService.apartmentBookings.findFirst({
        where: { userId: metadata.userId, id: metadata.bookingId },
      }),
    ]);

    if (tenant) {
      await this.databaseService.payment.create({
        data: {
          nextDue: this.getNextDueDate(apartment.durationOfRent[0]),
          amount: parseFloat(metadata.amount),
          purpose: metadata.purpose,
          refId: metadata.paymentId,
          userId: metadata.userId,
          apartmentId: metadata.apartmentId,
          Tenant: {
            connect: { id: tenant.id },
          },
        },
      });

      await this.databaseService.apartments.update({
        where: {
          id: metadata.apartmentId,
        },
        data: {
          avaliableUnits: { decrement: 1 },
        },
      });
    } else {
      await this.databaseService.apartments.update({
        where: {
          id: metadata.apartmentId,
        },
        data: {
          avaliableUnits: { decrement: 1 },
          tenants: {
            create: {
              user: { connect: { id: metadata.userId } },
              payment: {
                create: {
                  amount: parseFloat(metadata.amount),
                  refId: metadata.paymentId,
                  nextDue: this.getNextDueDate(apartment.durationOfRent[0]),
                  purpose: metadata.purpose,
                  userId: metadata.userId,
                  apartmentId: metadata.apartmentId,
                },
              },
              rentPrice: {
                create: {
                  agreementFee: pricing.agreementFee,
                  cautionFee: pricing.cautionFee,
                  rent: pricing.rent,
                  serviceCharge: pricing.serviceCharge,
                  total: pricing.total,
                  durationOfRent: apartment.durationOfRent[0],
                },
              },
              signedPolicies: [],
            },
          },
        },
      });
    }
  }

  getNextDueDate(duration: DURATION_OF_RENT[0]) {
    if (duration === DURATION_OF_RENT.MONTHLY) {
      return new Date(new Date().setMonth(new Date().getMonth() + 1));
    }

    if (duration === DURATION_OF_RENT.QUATERLY) {
      return new Date(new Date().setMonth(new Date().getMonth() + 3));
    }

    if (duration === DURATION_OF_RENT.ANNUALLY) {
      return new Date(new Date().setFullYear(new Date().getFullYear() + 1));
    }

    if (duration === DURATION_OF_RENT.WEEKLY) {
      return new Date(new Date().setDate(new Date().getDate() + 7));
    }

    if (duration === DURATION_OF_RENT.SIX_MONTHS) {
      return new Date(new Date().setMonth(new Date().getMonth() + 6));
    }

    return new Date();
  }

  getPaymentStatus(nextDueDate: Date) {
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

  private calculatePaymentStats(
    payments: { amount: number; createdAt: Date }[],
    period: 'monthly' | 'yearly',
  ) {
    const statsMap = new Map<
      string,
      { totalAmount: number; paymentCount: number }
    >();
    const now = new Date();
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // Aggregate stats
    payments.forEach((payment) => {
      const date = payment.createdAt;
      const periodKey =
        period === 'monthly'
          ? monthNames[date.getMonth()] // Use month names for monthly stats
          : `${date.getFullYear()}`; // Use year for yearly stats

      const existingStat = statsMap.get(periodKey) || {
        totalAmount: 0,
        paymentCount: 0,
      };

      statsMap.set(periodKey, {
        totalAmount: existingStat.totalAmount + payment.amount,
        paymentCount: existingStat.paymentCount + 1,
      });
    });

    // Create a complete 12-month list
    if (period === 'monthly') {
      const completeMonths = Array.from({ length: 12 }, (_, i) => {
        const index = (now.getMonth() - 11 + i + 12) % 12; // Calculate the rolling month index
        return monthNames[index];
      });

      return completeMonths.map((month) => ({
        period: month,
        totalAmount: statsMap.get(month)?.totalAmount || 0,
        paymentCount: statsMap.get(month)?.paymentCount || 0,
      }));
    }

    // For yearly stats, include up to 12 years
    const currentYear = now.getFullYear();
    const completeYears = Array.from({ length: 12 }, (_, i) =>
      (currentYear - 11 + i).toString(),
    );

    return completeYears.map((year) => ({
      period: year,
      totalAmount: statsMap.get(year)?.totalAmount || 0,
      paymentCount: statsMap.get(year)?.paymentCount || 0,
    }));
  }

  private formatDateRange(date: string) {
    const [from, to] = date.split('-').map((d) => d.split(':')[1]);

    return { gte: new Date(from), lte: new Date(to) };
  }
}

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Cache } from 'cache-manager';
import { clean } from '../common/clean';
import slugify from '../common/slugify';
import { DatabaseService } from '../database/database.service';
import getKey from '../utils/get-key';
import {
  ApartmentPricing,
  CreateApartmentDto,
  UpdateApartmentDto,
} from './dto';
import { ApartmentDto, ApartmentsDto } from './dto/apartment.dto';
import getDel from '../utils/get-delete';

type FindAllArgs = {
  search: string;
  offset: number;
  limit: number;
  type_of_apartment: string;
  amenities: string;
  duration_of_rent: string;
  price: string;
  bathroom: string;
  bedroom: string;
  locations: string;
  installment: string;
};

type TypeOfApartment =
  | 'ONE_BEDROOM'
  | 'SELF_CONTAINED'
  | 'TWO_BEDROOM_OR_MORE'
  | 'DUPLEX'
  | 'BUNGALOW'
  | 'MINI_FLAT'
  | 'PENTHOUSE';

type DurationOfRent =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUATERLY'
  | 'SIX_MONTHS'
  | 'ANNUALLY';

type FindApartmentsByIdsArgs = {
  ids: string[];
  offset: number;
  limit: number;
};

@Injectable()
export class ApartmentsService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(userId: string, args: CreateApartmentDto) {
    try {
      const pricing = {
        rent: args.rent,
        serviceCharge: args.rent * 0.1,
        cautionFee: args.rent * 0.2,
        agreementFee: args.rent * 0.05,
      };
      await this.databaseService.apartments.create({
        data: {
          name: args.name,
          userId,
          images: args.images,
          slug: slugify(args.name),
          numberOfBathroom: 1,
          // numberOfBathroom: args.numberOfBathroom,
          apartmentType: args.apartmentType,
          description: args.description,
          numberOfBedroom: 0,
          durationOfRent: [args.durationOfRent],
          amenities: args.amenities,
          pricing: {
            create: {
              ...pricing,
              total: this.calculateTotalPrice(pricing),
            },
          },
          location: {
            create: {
              address: args.address,
              city: args.city,
              country: args.country,
              state: args.state,
              postalCode: args.postalCode,
            },
          },
          bookingOptions: { create: args.bookingOptions },
          houseRule: args.houseRule,
          tags: args.tags,
          avaliableUnits: args.avaliableUnits,
          totalUnit: args.totalUnit,
          policies: args.policies,
          otherAmenities: args.otherAmenities,
        },
        include: {
          bookingOptions: true,
          pricing: true,
          location: true,
        },
      });

      await this.resetCache();
      return { message: 'New apartment created' };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async createMany(userId: string, args: CreateApartmentDto[]) {
    try {
      for (let i = 0; i < args.length; i++) {
        await this.create(userId, args[i]);
      }

      await this.resetCache();
      return { message: 'Apartments created' };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(args: FindAllArgs) {
    const { offset, limit, ...rest } = args;

    const cacheKey = getKey('apartments', args);

    const cache = await this.cacheManager.get(cacheKey);

    if (cache) return cache;

    const where = this.formatFilter(rest);

    const apartments = await this.databaseService.apartments.findMany({
      where:
        where.OR.length > 0
          ? where
          : {
              AND: {
                archived: false,
                isDeleted: false,
              },
            },
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
      where: where.OR.length > 0 ? where : { archived: false },
    });

    const data = {
      totalItems,
      results: apartments,
    };

    await this.cacheManager.set(cacheKey, data);

    return data;
  }

  async findAllProperties(args: FindAllArgs & { userId: string }) {
    const { offset, limit, ...rest } = args;

    const cacheKey = getKey('properties', args);

    const cache = await this.cacheManager.get(cacheKey);

    if (cache) return cache;

    const where = this.formatFilter(rest, false);

    const apartments = await this.databaseService.apartments.findMany({
      where:
        where.OR.length > 0
          ? where
          : clean({
              userId: where.AND.userId,
              isDeleted: false,
            }),
      include: {
        bookingOptions: true,
        pricing: true,
        location: true,
        tenants: {
          include: {
            user: true,
            payment: {
              select: {
                nextDue: true,
              },
            },
          },
        },
      },
      skip: offset,
      take: limit,
    });

    const totalItems = await this.databaseService.apartments.count({
      where:
        where.OR.length > 0
          ? where
          : clean({
              userId: where.AND.userId,
              archived: false,
            }),
    });

    const data = {
      totalItems,
      results: apartments,
    };

    await this.cacheManager.set(cacheKey, data);

    return data;
  }

  async findSimilar(apartmentId: string, offset: number, limit: number) {
    const cacheKey = getKey('apartments-similar', {
      apartmentId,
      offset,
      limit,
    });

    const cache = await this.cacheManager.get(cacheKey);

    if (cache) return cache;

    const providedApartment = await this.findOneById(apartmentId);

    if (!providedApartment) throw new NotFoundException('Apartment not found');

    const {
      location,
      numberOfBedroom,
      numberOfBathroom,
      amenities,
      houseRule,
      apartmentType,
      durationOfRent,
      rating,
      tags,
      otherAmenities,
    } = providedApartment;

    const where = {
      OR: [
        // Similar location
        {
          OR: [
            { location: { address: { contains: location.address } } },
            { location: { city: { contains: location.city } } },
            { location: { country: { contains: location.country } } },
            { location: { state: { contains: location.state } } },
          ],
        },
        // Similar number of bedrooms
        {
          numberOfBedroom: numberOfBedroom,
        },
        // Similar number of bathrooms
        {
          numberOfBathroom: numberOfBathroom,
        },
        // OR condition for similar amenities
        {
          amenities: { hasSome: amenities },
        },
        // OR condition for similar otherAmenities
        {
          otherAmenities: { hasSome: otherAmenities },
        },
        // OR condition for similar house rules
        {
          houseRule: { hasSome: houseRule },
        },
        // Similar apartment type
        {
          apartmentType: apartmentType,
        },
        // Similar duration of rent
        {
          durationOfRent: { hasSome: durationOfRent },
        },
        // Similar rating
        {
          rating: rating,
        },
        // Similar tags
        {
          tags: { hasSome: tags },
        },
      ],
      // Exclude the provided apartment from the results
      NOT: {
        id: apartmentId,
        archived: true,
        isDeleted: true,
      },
    };

    const similarApartments = await this.databaseService.apartments.findMany({
      where,
      include: {
        bookingOptions: true,
        pricing: true,
        location: true,
        tenants: true,
      },
      skip: offset,
      take: limit,
    });

    const totalItems = await this.databaseService.apartments.count({ where });

    return { totalItems, results: similarApartments };
  }

  async findSearch(search: string, args: FindAllArgs) {
    const { offset, limit, ...rest } = args;

    const cacheKey = getKey('apartments', { ...args, search });

    const cache = await this.cacheManager.get(cacheKey);

    if (cache) return cache;

    const format = this.formatFilter(rest);

    const where: Prisma.ApartmentsWhereInput = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        ...format.OR,
      ],
      NOT: {
        archived: true,
        isDeleted: true,
      },
    };
    const apartments = await this.databaseService.apartments.findMany({
      where,
      include: {
        bookingOptions: true,
        pricing: true,
        location: true,
        tenants: true,
      },
      skip: offset,
      take: limit,
    });

    const totalItems = await this.databaseService.apartments.count({ where });

    const data = {
      search,
      totalItems,
      results: apartments,
    };

    await this.cacheManager.set(cacheKey, data);

    return data;
  }

  async findOneById(apartmentId: string) {
    const cacheKey = getKey('apartment', { apartmentId });

    const cache = await this.cacheManager.get<ApartmentDto>(cacheKey);

    if (cache) return cache;

    const apartment = await this.databaseService.apartments.findFirst({
      where: {
        id: apartmentId,
        AND: {
          archived: false,
          isDeleted: false,
        },
      },
      include: {
        bookingOptions: true,
        pricing: true,
        location: true,
        tenants: true,
      },
    });

    await this.cacheManager.set(cacheKey, apartment);

    return apartment;
  }

  async findOneBySlug(slug: string) {
    const cacheKey = getKey('apartment', { slug });

    const cache = await this.cacheManager.get<ApartmentDto>(cacheKey);

    if (cache) return cache;

    const apartment = await this.databaseService.apartments.findFirst({
      where: {
        slug,
        AND: {
          archived: false,
          isDeleted: false,
        },
      },
      include: {
        bookingOptions: true,
        pricing: true,
        location: true,
        tenants: true,
      },
    });

    await this.cacheManager.set(cacheKey, apartment);

    return apartment;
  }

  async findApartmentsByIds({ ids, limit, offset }: FindApartmentsByIdsArgs) {
    const cacheKey = getKey('apartments-by-ids', { ids, limit, offset });

    const cache = await this.cacheManager.get<ApartmentsDto>(cacheKey);

    if (cache) return cache;

    const where = {
      id: { in: ids },
      AND: { archived: false, isDeleted: false },
    };
    const apartments = await this.databaseService.apartments.findMany({
      where,
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
      where,
    });

    return { totalItems, results: apartments };
  }

  async update(apartmentId: string, args: UpdateApartmentDto) {
    await this.databaseService.apartments.update({
      where: { id: apartmentId },
      data: {
        ...args,
        location: { update: args.location },
        pricing: { update: args.pricing },
        bookingOptions: { update: args.bookingOptions },
      },
    });

    await this.resetCache();
    return { message: 'Apartment updated successfully' };
  }

  async delete(apartmentId: string) {
    try {
      await this.databaseService.apartments.update({
        where: { id: apartmentId },
        data: { isDeleted: true },
      });

      await this.resetCache();

      return {
        message: `Apartment with id #${apartmentId} deleted successfully`,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }
  async archivedApartment(apartmentId: string) {
    try {
      await this.databaseService.apartments.update({
        where: { id: apartmentId },
        data: { archived: true },
      });

      await this.resetCache();

      return {
        message: `Apartment with id #${apartmentId} archived successfully`,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
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

  async getWistLists(userId: string, offset: number, limit: number) {
    const wishlist = await this.databaseService.wishList.findFirst({
      where: { userId },
    });

    if (!wishlist) return { message: 'Wishlist is empty' };

    const apartments = await this.findApartmentsByIds({
      ids: wishlist.apartmentIds,
      offset,
      limit,
    });

    return { results: apartments, totalItems: wishlist.apartmentIds.length };
  }

  async addToWishlist(userId: string, apartmentId: string) {
    const wishlist = await this.databaseService.wishList.findFirst({
      where: { userId },
    });

    if (wishlist) {
      await this.databaseService.wishList.update({
        where: { id: wishlist.id },
        data: {
          apartmentIds: {
            push: apartmentId,
          },
        },
      });
    } else {
      await this.databaseService.wishList.create({
        data: {
          userId,
          apartmentIds: [apartmentId],
        },
      });
    }

    return { message: 'Apartment added to wishlist' };
  }

  async removeFromWistList(userId: string, apartmentId: string) {
    const wishlist = await this.databaseService.wishList.findFirst({
      where: { userId },
    });

    if (!wishlist) return { message: 'Apartment not found in wishlist' };

    await this.databaseService.wishList.update({
      where: { id: wishlist.id },
      data: {
        apartmentIds: {
          set: wishlist.apartmentIds.filter((id) => id !== apartmentId),
        },
      },
    });

    return { message: 'Apartment removed from wishlist' };
  }

  private async resetCache() {
    await getDel(this.cacheManager, [
      'apartments*',
      'properties*',
      'apartments-similar*',
      'apartment*',
      'apartments-by-ids*',
    ]);
  }

  private calculateTotalPrice(args: ApartmentPricing) {
    const { agreementFee, cautionFee, rent, serviceCharge } = args;

    return agreementFee + cautionFee + rent + serviceCharge;
  }

  private formatFilter(
    args: Omit<FindAllArgs & { userId?: string }, 'limit' | 'offset'>,
    archive = true,
  ) {
    const {
      locations,
      bathroom,
      bedroom,
      type_of_apartment,
      duration_of_rent,
      price,
      installment,
      userId,
      search,
    } = args;
    // TODO: Need to work on amentities
    const OR: Prisma.ApartmentsWhereInput[] = [];

    if (search) {
      OR.push({
        name: { contains: search, mode: 'insensitive' },
      });
    }

    if (locations) {
      const location = locations.split(',');
      OR.push({
        OR: [
          { location: { address: { in: location } } },
          { location: { city: { in: location } } },
          { location: { country: { in: location } } },
          { location: { state: { in: location } } },
        ],
      });
    }

    if (bathroom) {
      OR.push({
        numberOfBathroom:
          bathroom === '4+' ? { gte: 4 } : { equals: Number(bathroom) },
      });
    }

    if (bedroom) {
      OR.push({
        numberOfBedroom:
          bedroom === '4+' ? { gte: 4 } : { equals: Number(bedroom) },
      });
    }

    if (type_of_apartment) {
      const typeOfApartment = type_of_apartment
        .toUpperCase()
        .replaceAll(' ', '_')
        .replace('two', '2') as TypeOfApartment;
      if (
        [
          'ONE_BEDROOM',
          'SELF_CONTAINED',
          'TWO_BEDROOM_OR_MORE',
          'DUPLEX',
          'BUNGALOW',
          'MINI_FLAT',
          'PENTHOUSE',
        ].includes(typeOfApartment)
      ) {
        OR.push({
          apartmentType: typeOfApartment,
        });
      }
    }

    if (duration_of_rent) {
      const durationOfRent = duration_of_rent
        .split(',')
        .map((duration) =>
          duration.toUpperCase().replaceAll(' ', '_'),
        ) as DurationOfRent[];

      const set2 = new Set([
        'DAILY',
        'WEEKLY',
        'MONTHLY',
        'QUATERLY',
        'SIX_MONTHS',
        'ANNUALLY',
      ]);

      if (durationOfRent.every((str) => set2.has(str))) {
        OR.push({
          durationOfRent: { hasSome: durationOfRent },
        });
      }
    }

    if (price) {
      const priceRange = price.split('-').map((value) => Number(value)) as [
        number,
        number,
      ];

      OR.push({
        pricing: {
          total: {
            gte: priceRange[0],
            lte: priceRange[1],
          },
        },
      });
    }

    if (installment) {
      OR.push({
        bookingOptions: {
          OR: [{ installment: installment === 'true' ? true : false }],
        },
      });
    }
    return clean({
      OR,
      AND: userId
        ? { userId, isDeleted: false, archive }
        : { isDeleted: false, archive },
    });
  }
}

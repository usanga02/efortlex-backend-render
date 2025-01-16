import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { join } from 'path';
import { readFile } from 'fs/promises';
import slugify from './common/slugify';
import { AuthService } from './auth/auth.service';

@Injectable()
export class AppService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly authService: AuthService,
  ) {}

  async resetDatabase() {
    try {
      /** WARNING: Should be triggered from github action **/

      const users = [
        {
          firstName: 'Olamilekan',
          lastName: 'Abiola',
          email: 'lakkyt21@gmail.com',
          password: 'Testing21@',
          isTenant: false,
        },
        {
          firstName: 'Lordson',
          lastName: 'Silver',
          email: 'lakkyt2003@gmail.com',
          password: 'Testing21@',
          isTenant: true,
        },
        {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'admin21@gmail.com',
          password: 'Testing21@',
          isAdmin: true,
          isTenant: false,
        },
      ];

      let landlordUser: { id: string } | null = null;

      for (let i = 0; i < users.length; i++) {
        const user = users[i];

        const userInfo = await this.findUser(user.email);

        if (!userInfo?.id) {
          await this.authService.register(user);

          if (!user.isTenant && !user.isAdmin) {
            landlordUser = await this.findUser(user.email);
          }
        }
      }

      const data = await readFile(
        join(__dirname, '../src/data/apartments_1.json'),
        { encoding: 'utf-8' },
      );

      const apartments = JSON.parse(data);

      for (let i = 0; i < apartments.length; i++) {
        const args = apartments[i];

        await this.databaseService.apartments.create({
          data: {
            name: args.name,
            userId: landlordUser.id,
            images: args.images,
            slug: slugify(args.name),
            numberOfBathroom: 1,
            // numberOfBathroom: args.numberOfBathroom,
            apartmentType: args.apartmentType,
            description: args.description,
            numberOfBedroom: 0,
            durationOfRent: args.durationOfRent,
            amenities: args.amenities,
            pricing: {
              create: {
                ...args.pricing,
                total: this.calculateTotalPrice(args.pricing),
              },
            },
            location: {
              create: {
                address: 'Azikwe Close, off Madueke Road',
                city: 'New Haven',
                country: 'Nigeria',
                state: 'Enugu',
                postalCode: '',
              },
            },
            bookingOptions: { create: args.bookingOptions },
            houseRule: args.houseRule,
            tags: args.tags,
            avaliableUnits: 20,
            totalUnit: 20,
            policies: args.policies,
            otherAmenities: args.otherAmenities,
          },
          include: {
            bookingOptions: true,
            pricing: true,
            location: true,
          },
        });
      }

      return apartments;
    } catch (error) {
      throw error;
    }
  }

  async findUser(email: string) {
    const userInfo = await this.databaseService.user.findFirst({
      where: { email },
      select: { id: true },
    });

    return userInfo;
  }

  private calculateTotalPrice(args: any) {
    const { agreementFee, cautionFee, rent, serviceCharge } = args;

    return agreementFee + cautionFee + rent + serviceCharge;
  }
}

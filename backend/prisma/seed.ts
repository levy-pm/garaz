import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const makesWithModels: Record<string, string[]> = {
  'Abarth': ['124 Spider', '500', '595', '695', 'Punto'],
  'Acura': ['ILX', 'Integra', 'MDX', 'NSX', 'RDX', 'TL', 'TLX', 'TSX'],
  'Alfa Romeo': ['147', '156', '159', '166', '4C', 'Giulia', 'Giulietta', 'MiTo', 'Stelvio', 'Tonale'],
  'Alpine': ['A110', 'A290'],
  'Aston Martin': ['DB11', 'DB12', 'DB9', 'DBS', 'DBX', 'Rapide', 'V12 Vantage', 'Vantage'],
  'Audi': ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'e-tron', 'e-tron GT', 'Q2', 'Q3', 'Q4 e-tron', 'Q5', 'Q7', 'Q8', 'R8', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'RS Q8', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'SQ5', 'SQ7', 'SQ8', 'TT'],
  'Bentley': ['Bentayga', 'Continental GT', 'Flying Spur', 'Mulsanne'],
  'BMW': ['1', '2', '2 Active Tourer', '3', '4', '5', '6', '7', '8', 'i3', 'i4', 'i5', 'i7', 'iX', 'iX1', 'iX3', 'M2', 'M3', 'M4', 'M5', 'M8', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'XM', 'Z4'],
  'Bugatti': ['Chiron', 'Veyron'],
  'Buick': ['Enclave', 'Encore', 'Envision', 'LaCrosse', 'Regal'],
  'Cadillac': ['CT4', 'CT5', 'Escalade', 'Lyriq', 'XT4', 'XT5', 'XT6'],
  'Chevrolet': ['Blazer', 'Bolt', 'Camaro', 'Colorado', 'Corvette', 'Cruze', 'Equinox', 'Impala', 'Malibu', 'Silverado', 'Spark', 'Suburban', 'Tahoe', 'Traverse', 'Trax'],
  'Chrysler': ['300', 'Pacifica', 'Voyager'],
  'Citroën': ['Berlingo', 'C1', 'C3', 'C3 Aircross', 'C4', 'C4 Cactus', 'C4 Picasso', 'C5', 'C5 Aircross', 'C5 X', 'DS3', 'DS4', 'DS5', 'Jumper', 'Jumpy', 'SpaceTourer'],
  'Cupra': ['Ateca', 'Born', 'Formentor', 'Leon', 'Tavascan'],
  'Dacia': ['Duster', 'Jogger', 'Logan', 'Sandero', 'Spring'],
  'Daewoo': ['Lanos', 'Matiz', 'Nubira', 'Tacuma'],
  'Daihatsu': ['Cuore', 'Sirion', 'Terios'],
  'Dodge': ['Challenger', 'Charger', 'Durango', 'Journey', 'Nitro', 'Ram'],
  'DS': ['DS 3', 'DS 4', 'DS 5', 'DS 7', 'DS 9'],
  'Ferrari': ['296', '488', 'F8', 'GTC4Lusso', 'Portofino', 'Purosangue', 'Roma', 'SF90'],
  'Fiat': ['124 Spider', '500', '500L', '500X', 'Bravo', 'Doblo', 'Ducato', 'Freemont', 'Grande Punto', 'Panda', 'Punto', 'Tipo'],
  'Ford': ['Bronco', 'EcoSport', 'Edge', 'Escape', 'Explorer', 'F-150', 'Fiesta', 'Focus', 'Fusion', 'Galaxy', 'Kuga', 'Maverick', 'Mondeo', 'Mustang', 'Mustang Mach-E', 'Puma', 'Ranger', 'S-Max', 'Tourneo', 'Transit'],
  'Genesis': ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'],
  'GMC': ['Acadia', 'Canyon', 'Sierra', 'Terrain', 'Yukon'],
  'Honda': ['Accord', 'City', 'Civic', 'CR-V', 'e', 'FR-V', 'HR-V', 'Jazz', 'ZR-V'],
  'Hyundai': ['Bayon', 'Elantra', 'i10', 'i20', 'i30', 'i40', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'ix20', 'ix35', 'Kona', 'Palisade', 'Santa Fe', 'Sonata', 'Staria', 'Tucson', 'Veloster'],
  'Infiniti': ['Q30', 'Q50', 'Q60', 'QX30', 'QX50', 'QX55', 'QX60', 'QX70', 'QX80'],
  'Isuzu': ['D-Max'],
  'Iveco': ['Daily'],
  'Jaguar': ['E-Pace', 'F-Pace', 'F-Type', 'I-Pace', 'XE', 'XF', 'XJ'],
  'Jeep': ['Avenger', 'Cherokee', 'Commander', 'Compass', 'Gladiator', 'Grand Cherokee', 'Renegade', 'Wrangler'],
  'Kia': ['Carnival', 'Ceed', 'EV6', 'EV9', 'Niro', 'Optima', 'Picanto', 'ProCeed', 'Rio', 'Seltos', 'Sorento', 'Soul', 'Sportage', 'Stinger', 'Stonic', 'Venga', 'XCeed'],
  'Lamborghini': ['Aventador', 'Huracán', 'Revuelto', 'Urus'],
  'Lancia': ['Delta', 'Musa', 'Ypsilon'],
  'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'Freelander', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar'],
  'Lexus': ['CT', 'ES', 'GS', 'IS', 'LC', 'LS', 'LX', 'NX', 'RC', 'RX', 'RZ', 'UX'],
  'Lincoln': ['Aviator', 'Corsair', 'Nautilus', 'Navigator'],
  'Lotus': ['Eletre', 'Emira', 'Evora'],
  'Maserati': ['Ghibli', 'GranTurismo', 'Grecale', 'Levante', 'MC20', 'Quattroporte'],
  'Mazda': ['2', '3', '5', '6', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'CX-9', 'MX-30', 'MX-5'],
  'McLaren': ['540C', '570S', '600LT', '620R', '720S', '765LT', 'Artura', 'GT'],
  'Mercedes-Benz': ['A', 'AMG GT', 'B', 'C', 'CLA', 'CLE', 'CLS', 'E', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'G', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'S', 'SL', 'Sprinter', 'V', 'Vito'],
  'MG': ['3', '4', '5', 'HS', 'Marvel R', 'ZS'],
  'Mini': ['Clubman', 'Convertible', 'Cooper', 'Countryman', 'Paceman'],
  'Mitsubishi': ['ASX', 'Eclipse Cross', 'L200', 'Lancer', 'Outlander', 'Pajero', 'Space Star'],
  'Nissan': ['Ariya', 'Juke', 'Leaf', 'Micra', 'Navara', 'Note', 'NV200', 'NV300', 'Pathfinder', 'Primastar', 'Pulsar', 'Qashqai', 'Townstar', 'X-Trail'],
  'Opel': ['Adam', 'Astra', 'Combo', 'Corsa', 'Crossland', 'Grandland', 'Insignia', 'Karl', 'Meriva', 'Mokka', 'Movano', 'Vivaro', 'Zafira'],
  'Peugeot': ['108', '2008', '208', '3008', '301', '308', '408', '5008', '508', 'Boxer', 'Expert', 'Partner', 'Rifter', 'Traveller'],
  'Polestar': ['1', '2', '3'],
  'Porsche': ['718', '911', 'Cayenne', 'Macan', 'Panamera', 'Taycan'],
  'RAM': ['1500', '2500', '3500'],
  'Renault': ['Arkana', 'Austral', 'Captur', 'Clio', 'Espace', 'Fluence', 'Grand Scenic', 'Kadjar', 'Kangoo', 'Koleos', 'Laguna', 'Master', 'Megane', 'Megane E-Tech', 'Modus', 'Scenic', 'Talisman', 'Trafic', 'Twingo', 'ZOE'],
  'Rolls-Royce': ['Cullinan', 'Dawn', 'Ghost', 'Phantom', 'Spectre', 'Wraith'],
  'Saab': ['9-3', '9-5'],
  'SEAT': ['Alhambra', 'Altea', 'Arona', 'Ateca', 'Ibiza', 'Leon', 'Mii', 'Tarraco', 'Toledo'],
  'Škoda': ['Citigo', 'Enyaq', 'Fabia', 'Kamiq', 'Karoq', 'Kodiaq', 'Octavia', 'Rapid', 'Roomster', 'Scala', 'Superb', 'Yeti'],
  'Smart': ['EQ fortwo', 'forfour', 'fortwo'],
  'SsangYong': ['Korando', 'Musso', 'Rexton', 'Tivoli', 'Torres'],
  'Subaru': ['BRZ', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Levorg', 'Outback', 'Solterra', 'WRX', 'XV'],
  'Suzuki': ['Across', 'Alto', 'Baleno', 'Ignis', 'Jimny', 'S-Cross', 'Swace', 'Swift', 'Vitara'],
  'Tesla': ['Model 3', 'Model S', 'Model X', 'Model Y'],
  'Toyota': ['Auris', 'Avensis', 'Aygo', 'Aygo X', 'bZ4X', 'C-HR', 'Camry', 'Corolla', 'Corolla Cross', 'GR86', 'GR Yaris', 'Highlander', 'Hilux', 'Land Cruiser', 'Mirai', 'ProAce', 'Prius', 'RAV4', 'Supra', 'Verso', 'Yaris', 'Yaris Cross'],
  'Volkswagen': ['Amarok', 'Arteon', 'Caddy', 'Crafter', 'Golf', 'ID.3', 'ID.4', 'ID.5', 'ID.7', 'ID. Buzz', 'Jetta', 'Multivan', 'Passat', 'Polo', 'Scirocco', 'Sharan', 'T-Cross', 'T-Roc', 'Taigo', 'Tiguan', 'Touareg', 'Touran', 'Transporter', 'Up!'],
  'Volvo': ['C30', 'C40', 'C70', 'EX30', 'EX90', 'S40', 'S60', 'S80', 'S90', 'V40', 'V50', 'V60', 'V70', 'V90', 'XC40', 'XC60', 'XC70', 'XC90'],
  // Motocykle
  'BMW Motorrad': ['F 750 GS', 'F 850 GS', 'F 900 R', 'F 900 XR', 'G 310 GS', 'G 310 R', 'K 1600', 'M 1000 RR', 'R 1250 GS', 'R 1250 RT', 'R nineT', 'S 1000 R', 'S 1000 RR', 'S 1000 XR'],
  'Ducati': ['Diavel', 'Hypermotard', 'Monster', 'Multistrada', 'Panigale', 'Scrambler', 'Streetfighter', 'SuperSport'],
  'Harley-Davidson': ['Breakout', 'Fat Bob', 'Fat Boy', 'Heritage Classic', 'Iron 883', 'LiveWire', 'Low Rider', 'Pan America', 'Road Glide', 'Road King', 'Softail', 'Sportster', 'Street Bob', 'Street Glide'],
  'Honda Moto': ['Africa Twin', 'CB 650 R', 'CB 1000 R', 'CBR 650 R', 'CBR 1000 RR', 'CMX 500 Rebel', 'CRF 1100', 'Forza', 'Gold Wing', 'NC 750', 'NT 1100', 'PCX', 'X-ADV'],
  'Kawasaki': ['ER-6', 'H2', 'Ninja 400', 'Ninja 650', 'Ninja 1000', 'Ninja ZX-6R', 'Ninja ZX-10R', 'Versys 650', 'Versys 1000', 'Vulcan S', 'W800', 'Z400', 'Z650', 'Z900', 'Z H2', 'ZX-4RR'],
  'KTM': ['125 Duke', '200 Duke', '390 Adventure', '390 Duke', '690 SMC R', '790 Adventure', '790 Duke', '890 Adventure', '890 Duke', '1290 Super Adventure', '1290 Super Duke', 'RC 390'],
  'Suzuki Moto': ['Burgman', 'GSX-R 600', 'GSX-R 750', 'GSX-R 1000', 'GSX-S 750', 'GSX-S 1000', 'Hayabusa', 'SV 650', 'V-Strom 650', 'V-Strom 1050'],
  'Triumph': ['Bonneville', 'Daytona', 'Explorer', 'Rocket 3', 'Scrambler', 'Speed Triple', 'Street Triple', 'Thruxton', 'Tiger 660', 'Tiger 900', 'Tiger 1200', 'Trident 660'],
  'Yamaha': ['FJR 1300', 'MT-03', 'MT-07', 'MT-09', 'MT-10', 'Niken', 'R1', 'R3', 'R6', 'R7', 'T-Max', 'Tenere 700', 'Tracer 7', 'Tracer 9', 'XSR 700', 'XSR 900', 'YZF-R1', 'YZF-R125'],
};

async function main() {
  console.log('Seeding catalog makes and models...');

  for (const [makeName, models] of Object.entries(makesWithModels)) {
    const make = await prisma.catalogMake.upsert({
      where: { name: makeName },
      update: {},
      create: { name: makeName },
    });

    for (const modelName of models) {
      await prisma.catalogModel.upsert({
        where: { makeId_name: { makeId: make.id, name: modelName } },
        update: {},
        create: { name: modelName, makeId: make.id },
      });
    }
  }

  console.log(`Seeded ${Object.keys(makesWithModels).length} makes with models.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

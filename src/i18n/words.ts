import type { Locale } from './routing';

/* Every word of the public website in its three languages. The English is the site's own wording, unchanged; the
   French and Arabic await a native speaker's review (DEVELOPMENT_PROGRESS.md, decision 6). Read on the server
   (getWords in ./server-words); browser components get the words they need from the page. */

const en = {
  meta: {
    home: { title: 'Milcar | Supercars with the whole story', description: 'Milcar Automotive Consultancy. Walk into the showroom, see the whole car and its whole past, and book a private viewing.', share: 'Every car has a story. We show you all of it.' },
    inventory: { title: 'Inventory | Milcar', description: 'See the cars in the Milcar showroom and ask for the full history of the one you want.' },
    featured: { title: 'Featured | Milcar', description: 'The cars in the Milcar showroom windows tonight. Pick a window to see the car.' },
    brands: { title: 'Brands | Milcar', description: 'The makers on the Milcar showroom floor. Pick one to see its cars, each with its full history on request.' },
    brand: (name: string) => `Every ${name} in the Milcar showroom, with full specs and its history on request.`,
    about: { title: 'About | Milcar', description: 'Milcar Automotive Consultancy: supercars and luxury cars, with the full history on the table.' },
    contact: { title: 'Contact | Milcar', description: 'Reach Milcar Automotive Consultancy, or book a private viewing of the car you want to see.' },
    viewing: { title: 'Private viewing | Milcar', description: 'Book a private viewing at Milcar: see the car and its papers side by side, before anyone talks about price.' },
    car: (name: string, tagline: string | null) => name + (tagline ? '. ' + tagline : '') + ' Full specs at Milcar, with its history available on request.',
    carMissing: 'Car details | Milcar',
    notFound: 'Page not found | Milcar',
  },
  nav: { tagline: 'Automotive Consultancy', featured: 'Featured', promise: 'The promise', build: 'The build', questions: 'Questions', inventory: 'Inventory', book: 'Book a viewing', languages: 'Language' },
  hero: {
    b1: 'Milcar. Come inside.', b2: 'Every car has a story.', b3: 'We show you all of it.', b4: 'Book a private viewing.', now: 'Book now', cue: 'Scroll to walk in',
    staticAlt: 'The Milcar showroom at night, its cars lit behind the glass', staticTitle: 'Every car has a story. We show you all of it.',
    staticText: 'Milcar Automotive Consultancy. Supercars and luxury cars, with the full history on the table.', staticBtn: 'Book a private viewing',
  },
  featured: {
    label: 'Featured tonight', title: 'In our windows.', hover: 'Point at a window to see the car.', touch: 'Tap a window to see the car.',
    plateAlt: 'The Milcar showroom at night, with one car behind each of its six glass windows', view: 'View car →',
    window: (name: string, year: number, price: string, n: number) => `${name}, ${year}, ${price}, in showroom window ${n}. View car`,
    noscript: 'See every car in the inventory.', inventory: 'View the inventory', book: 'Book a private viewing',
  },
  promise: { alt: 'The leather interior of a supercar', label: 'The promise', title: 'Ask to see everything.', docs: ['The VIN', 'The service records', 'The import papers', 'The mileage history'], ask: 'Ask for them before you ask the price.' },
  build: {
    title: 'See what\'s under the paint.', how: 'Hold the button. Let go and it eases back.', frameAlt: 'A bare carbon frame on workshop stands',
    colors: ['Race Red', 'Deep Blue', 'Silver', 'Black'], parts: ['Carbon frame', 'Engine', 'Wheels and brakes', 'Bodywork', 'Paint'],
    concept: ['Illustration only.', 'Not for sale.'], hold: 'Hold', holdLabel: 'Hold to build', stage: 'Stage {n} of 5: {part}', done: 'Finished. Pick a color.',
    pick: 'Now pick your color.', paint: 'Paint color', again: 'Build it again',
  },
  teaser: { label: 'The inventory', title: 'Every car, with its story.', text: 'See what\'s in the showroom, then ask for the history of the one you want.', btn: 'View the inventory', specs: (name: string) => name + ' specs' },
  process: {
    title: 'Three steps. No guessing.', step: (n: number) => `Step ${n}`,
    steps: [
      { alt: 'A black SUV in a dark tunnel with its lights on', title: 'Tell us what you want.', text: 'The car, the color, the budget. Or just the feeling.' },
      { alt: 'A red leather sports car interior', title: 'See the car and its papers.', text: 'Together, side by side, before anyone talks about price.' },
      { alt: 'An exposed chassis and engine', title: 'Bring your own mechanic.', text: 'Have the car checked by someone you trust.' },
    ],
  },
  faq: {
    title: 'Real questions.',
    items: [
      ['How do I know it was never crashed?', 'Ask for the history and check the car with your own mechanic. We want you to.'],
      ['Can you find a car you don\'t have?', 'Tell us the car you want. We\'ll tell you straight if we can find it.'],
      ['Can I see it in private?', 'Yes. Book a time and the showroom is yours.'],
    ] as [string, string][],
  },
  booking: {
    imgAlt: 'The Milcar showroom glowing at night', title: 'Book a private viewing.', text: 'Tell us how to reach you and which car you want to see.',
    name: 'Name', namePh: 'Your name', phone: 'Phone', phonePh: 'Your phone number', car: 'Car of interest', carPh: 'The car you have in mind',
    time: 'Preferred time', timeAny: 'Any time: call me to arrange it', pickDay: 'Choose a day', pickTime: 'Choose a time', send: 'Request my viewing', sending: 'Sending…',
    doneTitle: 'Thank you.', doneCall: 'We’ll call you shortly to arrange your viewing.', doneTime: 'We’ve noted {time}. We’ll call you to confirm it.',
    whatsapp: 'Prefer WhatsApp? Message us.',
    errors: {
      name: 'Please write your name.', phone: 'Please write your phone number with its country code, like +961 3 123 456.', taken: 'That time was just taken. Please choose another.',
      closed: 'That time is no longer available. Please choose another.', busy: 'Too many requests. Please wait a little, or call us.',
      offline: 'Our booking line isn’t connected yet. Please call or message us.', failed: 'Your request couldn’t be sent just now. Please try again, or call us.',
    },
  },
  footer: { tagline: 'Automotive Consultancy', explore: 'Explore', inventory: 'Inventory', brands: 'Brands', featured: 'Featured', about: 'About', contact: 'Contact', visit: 'Visit and call', viewings: 'Private viewings', book: 'Book a private viewing' },
  inventory: {
    label: 'The showroom', title: 'Inventory', text: 'Pick a car to see its full specs, then ask for its history.',
    sample: 'Preview: these are sample listings with stock photos. Your real cars and prices go here.',
    byType: 'Filter by type', byBrand: 'Filter by brand', all: 'All', allBrands: 'All brands', order: 'Order',
    sorts: { showroom: 'Showroom order', 'price-desc': 'Price, high to low', 'price-asc': 'Price, low to high', 'year-desc': 'Newest first' },
    empty: 'New cars are on their way. Book a viewing and we’ll tell you first.', none: 'No car matches that choice right now.', reset: 'Show every car',
    sampleTag: 'Sample', reserved: 'Reserved', specs: 'View specs',
  },
  car: {
    all: 'All cars', reservedLine: 'This car is reserved. Ask us to hear if it becomes available.', book: 'Book a private viewing', factory: 'Factory specs', thisCar: 'This car',
    rows: ['Year', 'Mileage', 'Color', 'Previous owners', 'Service records', 'Import papers'], ask: 'On request',
    /* the usual spec names, for a car whose specs were written in English only */
    specLabels: {} as Record<string, string>,
    note: 'Factory figures are for the model and can vary by year and market. Ask us to confirm them against this car’s papers.',
    next: 'Next car', photos: 'Photos:', unsplash: ' on Unsplash', km: 'km',
    gallery: { sample: 'Sample listing', reserved: 'Reserved', photo: 'Show photo', video: 'Play video', videoOf: 'Video of the {name}' },
  },
  brands: { label: 'The showroom', title: 'Brands', text: 'The makers on our floor. Pick one to see its cars.', count: (n: number) => `${n} ${n === 1 ? 'car' : 'cars'} on show`, see: 'See the cars', all: 'All brands', every: (name: string) => `Every ${name} on our floor. Pick a car to see its full specs, then ask for its history.` },
  about: { label: 'About Milcar', title: 'Every car has a story.', text: 'Milcar Automotive Consultancy. Supercars and luxury cars, with the full history on the table. We show you all of it.', inventory: 'View the inventory', book: 'Book a private viewing' },
  contact: { label: 'Contact', title: 'Come and see the car.', text: 'Tell us which car you want to see and we’ll arrange a private viewing.', showroom: 'The showroom', address: 'Address', hours: 'Opening hours', phone: 'Phone', whatsapp: 'WhatsApp', email: 'Email', instagram: 'Instagram', hello: 'Hello Milcar,' },
  viewing: { label: 'Private viewing', title: 'See the car and its papers.', text: 'Together, side by side, before anyone talks about price.' },
  missing: { page: 'This page isn’t here.', pageLine: 'It may have moved. The showroom is still open.', pageBtn: 'See the inventory', car: 'We couldn’t find that car.', carLine: 'It may have been sold. See what’s in the showroom now.', carBtn: 'Back to the inventory' },
  common: { priceOnRequest: 'Price on request', days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], skip: 'Skip to content' },
  bodyTypes: { supercar: 'Supercars', sports_car: 'Sports cars', suv: 'SUVs', sedan: 'Saloons', coupe: 'Coupés', convertible: 'Convertibles', grand_tourer: 'Grand tourers', pickup: 'Pickups', classic: 'Classics', other: 'Other' },
};
export type Words = typeof en;

const fr: Words = {
  meta: {
    home: { title: 'Milcar | Des voitures d’exception et toute leur histoire', description: 'Milcar Automotive Consultancy. Entrez dans le showroom, découvrez la voiture et tout son passé, et réservez une visite privée.', share: 'Chaque voiture a une histoire. Nous vous la montrons tout entière.' },
    inventory: { title: 'Nos voitures | Milcar', description: 'Découvrez les voitures du showroom Milcar et demandez l’historique complet de celle qui vous plaît.' },
    featured: { title: 'En vitrine | Milcar', description: 'Les voitures en vitrine ce soir chez Milcar. Choisissez une vitrine pour découvrir la voiture.' },
    brands: { title: 'Marques | Milcar', description: 'Les marques présentes dans le showroom Milcar. Choisissez-en une pour voir ses voitures, chacune avec son historique sur demande.' },
    brand: (name: string) => `Toutes les ${name} du showroom Milcar, avec leur fiche technique complète et leur historique sur demande.`,
    about: { title: 'À propos | Milcar', description: 'Milcar Automotive Consultancy : supercars et voitures de luxe, avec tout leur historique sur la table.' },
    contact: { title: 'Contact | Milcar', description: 'Contactez Milcar Automotive Consultancy ou réservez une visite privée de la voiture qui vous intéresse.' },
    viewing: { title: 'Visite privée | Milcar', description: 'Réservez une visite privée chez Milcar : la voiture et ses papiers côte à côte, avant de parler de prix.' },
    car: (name: string, tagline: string | null) => name + (tagline ? '. ' + tagline : '') + ' Fiche technique complète chez Milcar, historique disponible sur demande.',
    carMissing: 'Détails de la voiture | Milcar',
    notFound: 'Page introuvable | Milcar',
  },
  nav: { tagline: 'Automotive Consultancy', featured: 'En vitrine', promise: 'La promesse', build: 'L’assemblage', questions: 'Questions', inventory: 'Nos voitures', book: 'Réserver une visite', languages: 'Langue' },
  hero: {
    b1: 'Milcar. Entrez.', b2: 'Chaque voiture a une histoire.', b3: 'Nous vous la montrons tout entière.', b4: 'Réservez une visite privée.', now: 'Réserver', cue: 'Faites défiler pour entrer',
    staticAlt: 'Le showroom Milcar la nuit, ses voitures éclairées derrière les vitres', staticTitle: 'Chaque voiture a une histoire. Nous vous la montrons tout entière.',
    staticText: 'Milcar Automotive Consultancy. Supercars et voitures de luxe, avec tout leur historique sur la table.', staticBtn: 'Réserver une visite privée',
  },
  featured: {
    label: 'En vitrine ce soir', title: 'Dans nos vitrines.', hover: 'Survolez une vitrine pour découvrir la voiture.', touch: 'Touchez une vitrine pour découvrir la voiture.',
    plateAlt: 'Le showroom Milcar la nuit, une voiture derrière chacune de ses six vitrines', view: 'Voir la voiture →',
    window: (name: string, year: number, price: string, n: number) => `${name}, ${year}, ${price}, dans la vitrine ${n}. Voir la voiture`,
    noscript: 'Voir toutes les voitures.', inventory: 'Voir nos voitures', book: 'Réserver une visite privée',
  },
  promise: { alt: 'L’intérieur en cuir d’une supercar', label: 'La promesse', title: 'Demandez à tout voir.', docs: ['Le numéro de série (VIN)', 'Le carnet d’entretien', 'Les papiers d’importation', 'L’historique du kilométrage'], ask: 'Demandez-les avant de demander le prix.' },
  build: {
    title: 'Voyez ce qu’il y a sous la peinture.', how: 'Maintenez le bouton. Relâchez, tout revient doucement.', frameAlt: 'Un châssis en carbone nu sur des tréteaux d’atelier',
    colors: ['Rouge course', 'Bleu profond', 'Argent', 'Noir'], parts: ['Châssis carbone', 'Moteur', 'Roues et freins', 'Carrosserie', 'Peinture'],
    concept: ['Illustration seulement.', 'Pas à vendre.'], hold: 'Maintenir', holdLabel: 'Maintenir pour assembler', stage: 'Étape {n} sur 5 : {part}', done: 'Terminé. Choisissez une couleur.',
    pick: 'Choisissez maintenant votre couleur.', paint: 'Couleur de la peinture', again: 'L’assembler à nouveau',
  },
  teaser: { label: 'Nos voitures', title: 'Chaque voiture, avec son histoire.', text: 'Découvrez ce qu’il y a dans le showroom, puis demandez l’historique de celle qui vous plaît.', btn: 'Voir nos voitures', specs: (name: string) => 'Fiche technique : ' + name },
  process: {
    title: 'Trois étapes. Aucune devinette.', step: (n: number) => `Étape ${n}`,
    steps: [
      { alt: 'Un SUV noir dans un tunnel sombre, phares allumés', title: 'Dites-nous ce que vous voulez.', text: 'La voiture, la couleur, le budget. Ou simplement l’émotion.' },
      { alt: 'L’intérieur en cuir rouge d’une sportive', title: 'Voyez la voiture et ses papiers.', text: 'Ensemble, côte à côte, avant de parler de prix.' },
      { alt: 'Un châssis et un moteur à nu', title: 'Venez avec votre mécanicien.', text: 'Faites vérifier la voiture par quelqu’un en qui vous avez confiance.' },
    ],
  },
  faq: {
    title: 'De vraies questions.',
    items: [
      ['Comment savoir qu’elle n’a jamais été accidentée ?', 'Demandez l’historique et faites vérifier la voiture par votre mécanicien. Nous y tenons.'],
      ['Pouvez-vous trouver une voiture que vous n’avez pas ?', 'Dites-nous laquelle vous voulez. Nous vous dirons franchement si nous pouvons la trouver.'],
      ['Puis-je la voir en privé ?', 'Oui. Réservez un moment et le showroom est à vous.'],
    ],
  },
  booking: {
    imgAlt: 'Le showroom Milcar illuminé la nuit', title: 'Réservez une visite privée.', text: 'Dites-nous comment vous joindre et quelle voiture vous souhaitez voir.',
    name: 'Nom', namePh: 'Votre nom', phone: 'Téléphone', phonePh: 'Votre numéro de téléphone', car: 'Voiture souhaitée', carPh: 'La voiture qui vous intéresse',
    time: 'Moment souhaité', timeAny: 'N’importe quand : appelez-moi pour convenir', pickDay: 'Choisissez un jour', pickTime: 'Choisissez une heure', send: 'Demander ma visite', sending: 'Envoi…',
    doneTitle: 'Merci.', doneCall: 'Nous vous appelons très bientôt pour organiser votre visite.', doneTime: 'Nous avons noté {time}. Nous vous appelons pour le confirmer.',
    whatsapp: 'Vous préférez WhatsApp ? Écrivez-nous.',
    errors: {
      name: 'Merci d’indiquer votre nom.', phone: 'Merci d’indiquer votre numéro avec l’indicatif du pays, par exemple +961 3 123 456.', taken: 'Ce créneau vient d’être pris. Merci d’en choisir un autre.',
      closed: 'Ce créneau n’est plus disponible. Merci d’en choisir un autre.', busy: 'Trop de demandes. Merci de patienter un peu, ou appelez-nous.',
      offline: 'Notre ligne de réservation n’est pas encore connectée. Merci de nous appeler ou de nous écrire.', failed: 'Votre demande n’a pas pu être envoyée. Merci de réessayer, ou appelez-nous.',
    },
  },
  footer: { tagline: 'Automotive Consultancy', explore: 'Découvrir', inventory: 'Nos voitures', brands: 'Marques', featured: 'En vitrine', about: 'À propos', contact: 'Contact', visit: 'Venir et appeler', viewings: 'Visites privées', book: 'Réserver une visite privée' },
  inventory: {
    label: 'Le showroom', title: 'Nos voitures', text: 'Choisissez une voiture pour voir sa fiche technique, puis demandez son historique.',
    sample: 'Aperçu : ce sont des annonces d’exemple avec des photos d’illustration. Vos vraies voitures et vos prix viendront ici.',
    byType: 'Filtrer par type', byBrand: 'Filtrer par marque', all: 'Toutes', allBrands: 'Toutes les marques', order: 'Ordre',
    sorts: { showroom: 'Ordre du showroom', 'price-desc': 'Prix décroissant', 'price-asc': 'Prix croissant', 'year-desc': 'Les plus récentes' },
    empty: 'De nouvelles voitures arrivent. Réservez une visite et nous vous préviendrons en premier.', none: 'Aucune voiture ne correspond à ce choix pour le moment.', reset: 'Voir toutes les voitures',
    sampleTag: 'Exemple', reserved: 'Réservée', specs: 'Voir la fiche',
  },
  car: {
    all: 'Toutes les voitures', reservedLine: 'Cette voiture est réservée. Demandez-nous d’être prévenu si elle redevient disponible.', book: 'Réserver une visite privée', factory: 'Données constructeur', thisCar: 'Cette voiture',
    rows: ['Année', 'Kilométrage', 'Couleur', 'Propriétaires précédents', 'Carnet d’entretien', 'Papiers d’importation'], ask: 'Sur demande',
    specLabels: { Engine: 'Moteur', Power: 'Puissance', Torque: 'Couple', Gearbox: 'Boîte de vitesses', Drive: 'Transmission', '0 to 100 km/h': '0 à 100 km/h', '0 to 97 km/h': '0 à 97 km/h', 'Top speed': 'Vitesse maximale' },
    note: 'Les données constructeur concernent le modèle et peuvent varier selon l’année et le marché. Demandez-nous de les vérifier avec les papiers de cette voiture.',
    next: 'Voiture suivante', photos: 'Photos :', unsplash: ' sur Unsplash', km: 'km',
    gallery: { sample: 'Annonce d’exemple', reserved: 'Réservée', photo: 'Voir la photo', video: 'Lire la vidéo', videoOf: 'Vidéo de la {name}' },
  },
  brands: { label: 'Le showroom', title: 'Marques', text: 'Les marques présentes au showroom. Choisissez-en une pour voir ses voitures.', count: (n: number) => `${n} ${n === 1 ? 'voiture exposée' : 'voitures exposées'}`, see: 'Voir les voitures', all: 'Toutes les marques', every: (name: string) => `Toutes les ${name} du showroom. Choisissez une voiture pour voir sa fiche technique, puis demandez son historique.` },
  about: { label: 'À propos de Milcar', title: 'Chaque voiture a une histoire.', text: 'Milcar Automotive Consultancy. Supercars et voitures de luxe, avec tout leur historique sur la table. Nous vous la montrons tout entière.', inventory: 'Voir nos voitures', book: 'Réserver une visite privée' },
  contact: { label: 'Contact', title: 'Venez voir la voiture.', text: 'Dites-nous quelle voiture vous souhaitez voir et nous organiserons une visite privée.', showroom: 'Le showroom', address: 'Adresse', hours: 'Horaires', phone: 'Téléphone', whatsapp: 'WhatsApp', email: 'E-mail', instagram: 'Instagram', hello: 'Bonjour Milcar,' },
  viewing: { label: 'Visite privée', title: 'Voyez la voiture et ses papiers.', text: 'Ensemble, côte à côte, avant de parler de prix.' },
  missing: { page: 'Cette page n’existe pas.', pageLine: 'Elle a peut-être changé d’adresse. Le showroom, lui, est ouvert.', pageBtn: 'Voir nos voitures', car: 'Nous n’avons pas trouvé cette voiture.', carLine: 'Elle a peut-être été vendue. Découvrez ce qui est au showroom aujourd’hui.', carBtn: 'Retour aux voitures' },
  common: { priceOnRequest: 'Prix sur demande', days: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'], skip: 'Aller au contenu' },
  bodyTypes: { supercar: 'Supercars', sports_car: 'Sportives', suv: 'SUV', sedan: 'Berlines', coupe: 'Coupés', convertible: 'Cabriolets', grand_tourer: 'Grand tourisme', pickup: 'Pick-up', classic: 'Classiques', other: 'Autres' },
};

const ar: Words = {
  meta: {
    home: { title: 'ميلكار | سيارات استثنائية بكامل تاريخها', description: 'ميلكار للاستشارات في عالم السيارات. ادخل إلى المعرض، وتعرّف إلى السيارة وماضيها كاملاً، واحجز معاينة خاصة.', share: 'لكل سيارة قصة. ونحن نُريك إياها كاملة.' },
    inventory: { title: 'سياراتنا | ميلكار', description: 'تصفّح السيارات في معرض ميلكار واطلب التاريخ الكامل للسيارة التي تعجبك.' },
    featured: { title: 'في الواجهة | ميلكار', description: 'السيارات المعروضة الليلة في واجهات ميلكار. اختر واجهة لترى السيارة.' },
    brands: { title: 'العلامات | ميلكار', description: 'العلامات الموجودة في معرض ميلكار. اختر واحدة لترى سياراتها، ولكل منها تاريخها عند الطلب.' },
    brand: (name: string) => `كل سيارات ${name} في معرض ميلكار، بمواصفاتها الكاملة وتاريخها عند الطلب.`,
    about: { title: 'من نحن | ميلكار', description: 'ميلكار للاستشارات في عالم السيارات: سيارات خارقة وفاخرة، بتاريخها الكامل على الطاولة.' },
    contact: { title: 'تواصل معنا | ميلكار', description: 'تواصل مع ميلكار للاستشارات في عالم السيارات، أو احجز معاينة خاصة للسيارة التي تريد رؤيتها.' },
    viewing: { title: 'معاينة خاصة | ميلكار', description: 'احجز معاينة خاصة في ميلكار: السيارة وأوراقها جنباً إلى جنب، قبل أي حديث عن السعر.' },
    car: (name: string, tagline: string | null) => name + (tagline ? '. ' + tagline : '') + ' المواصفات الكاملة لدى ميلكار، وتاريخها متاح عند الطلب.',
    carMissing: 'تفاصيل السيارة | ميلكار',
    notFound: 'الصفحة غير موجودة | ميلكار',
  },
  nav: { tagline: 'Automotive Consultancy', featured: 'في الواجهة', promise: 'الوعد', build: 'التركيب', questions: 'أسئلة', inventory: 'سياراتنا', book: 'احجز معاينة', languages: 'اللغة' },
  hero: {
    b1: 'ميلكار. تفضّل بالدخول.', b2: 'لكل سيارة قصة.', b3: 'ونحن نُريك إياها كاملة.', b4: 'احجز معاينة خاصة.', now: 'احجز الآن', cue: 'مرّر للدخول',
    staticAlt: 'معرض ميلكار ليلاً، وسياراته مضاءة خلف الزجاج', staticTitle: 'لكل سيارة قصة. ونحن نُريك إياها كاملة.',
    staticText: 'ميلكار للاستشارات في عالم السيارات. سيارات خارقة وفاخرة، بتاريخها الكامل على الطاولة.', staticBtn: 'احجز معاينة خاصة',
  },
  featured: {
    label: 'في الواجهة الليلة', title: 'في واجهاتنا.', hover: 'مرّر المؤشر على واجهة لترى السيارة.', touch: 'المس واجهة لترى السيارة.',
    plateAlt: 'معرض ميلكار ليلاً، مع سيارة خلف كل واجهة من واجهاته الزجاجية الست', view: '← شاهد السيارة',
    window: (name: string, year: number, price: string, n: number) => `${name}، ${year}، ${price}، في الواجهة ${n}. شاهد السيارة`,
    noscript: 'شاهد كل السيارات.', inventory: 'شاهد سياراتنا', book: 'احجز معاينة خاصة',
  },
  promise: { alt: 'المقصورة الجلدية لسيارة خارقة', label: 'الوعد', title: 'اطلب أن ترى كل شيء.', docs: ['رقم الهيكل (VIN)', 'سجلّ الصيانة', 'أوراق الاستيراد', 'سجلّ عدّاد المسافة'], ask: 'اطلبها قبل أن تسأل عن السعر.' },
  build: {
    title: 'شاهد ما تحت الطلاء.', how: 'اضغط مطوّلاً على الزر. اتركه فيعود بهدوء.', frameAlt: 'هيكل من الكربون على حوامل الورشة',
    colors: ['أحمر السباق', 'أزرق داكن', 'فضّي', 'أسود'], parts: ['هيكل الكربون', 'المحرّك', 'العجلات والمكابح', 'الهيكل الخارجي', 'الطلاء'],
    concept: ['صورة توضيحية فقط.', 'ليست للبيع.'], hold: 'اضغط', holdLabel: 'اضغط مطوّلاً للتركيب', stage: 'المرحلة {n} من 5: {part}', done: 'اكتمل التركيب. اختر لوناً.',
    pick: 'اختر لونك الآن.', paint: 'لون الطلاء', again: 'ركّبها من جديد',
  },
  teaser: { label: 'سياراتنا', title: 'كل سيارة، بقصتها.', text: 'شاهد ما في المعرض، ثم اطلب تاريخ السيارة التي تعجبك.', btn: 'شاهد سياراتنا', specs: (name: string) => 'مواصفات ' + name },
  process: {
    title: 'ثلاث خطوات. بلا تخمين.', step: (n: number) => `الخطوة ${n}`,
    steps: [
      { alt: 'سيارة رياضية متعددة الاستخدامات سوداء في نفق مظلم وأضواؤها مضاءة', title: 'أخبرنا بما تريد.', text: 'السيارة، اللون، الميزانية. أو مجرّد الإحساس.' },
      { alt: 'مقصورة سيارة رياضية من الجلد الأحمر', title: 'شاهد السيارة وأوراقها.', text: 'معاً، جنباً إلى جنب، قبل أي حديث عن السعر.' },
      { alt: 'هيكل ومحرّك مكشوفان', title: 'أحضر ميكانيكيّك.', text: 'افحص السيارة عند من تثق به.' },
    ],
  },
  faq: {
    title: 'أسئلة حقيقية.',
    items: [
      ['كيف أعرف أنها لم تتعرّض لحادث؟', 'اطلب تاريخها وافحص السيارة عند ميكانيكيّك. نحن نشجّعك على ذلك.'],
      ['هل يمكنكم إيجاد سيارة ليست لديكم؟', 'أخبرنا بالسيارة التي تريدها. وسنقول لك بصراحة إن كنّا نستطيع إيجادها.'],
      ['هل يمكنني رؤيتها على انفراد؟', 'نعم. احجز موعداً ويصبح المعرض لك وحدك.'],
    ],
  },
  booking: {
    imgAlt: 'معرض ميلكار متوهّجاً ليلاً', title: 'احجز معاينة خاصة.', text: 'أخبرنا كيف نتواصل معك وأيّ سيارة تريد أن ترى.',
    name: 'الاسم', namePh: 'اسمك', phone: 'الهاتف', phonePh: 'رقم هاتفك', car: 'السيارة المطلوبة', carPh: 'السيارة التي تفكّر بها',
    time: 'الموعد المفضّل', timeAny: 'أيّ وقت: اتصلوا بي لتحديده', pickDay: 'اختر يوماً', pickTime: 'اختر الساعة', send: 'اطلب معاينتي', sending: 'جارٍ الإرسال…',
    doneTitle: 'شكراً لك.', doneCall: 'سنتصل بك قريباً لترتيب معاينتك.', doneTime: 'سجّلنا موعد {time}. سنتصل بك لتأكيده.',
    whatsapp: 'تفضّل واتساب؟ راسلنا.',
    errors: {
      name: 'يرجى كتابة اسمك.', phone: 'يرجى كتابة رقم هاتفك مع رمز البلد، مثل ‎+961 3 123 456.', taken: 'حُجز هذا الموعد للتوّ. يرجى اختيار موعد آخر.',
      closed: 'هذا الموعد لم يعد متاحاً. يرجى اختيار موعد آخر.', busy: 'طلبات كثيرة. يرجى الانتظار قليلاً أو الاتصال بنا.',
      offline: 'خطّ الحجز غير موصول بعد. يرجى الاتصال بنا أو مراسلتنا.', failed: 'تعذّر إرسال طلبك الآن. يرجى المحاولة مجدداً أو الاتصال بنا.',
    },
  },
  footer: { tagline: 'Automotive Consultancy', explore: 'اكتشف', inventory: 'سياراتنا', brands: 'العلامات', featured: 'في الواجهة', about: 'من نحن', contact: 'تواصل معنا', visit: 'زُرنا واتصل بنا', viewings: 'المعاينات الخاصة', book: 'احجز معاينة خاصة' },
  inventory: {
    label: 'المعرض', title: 'سياراتنا', text: 'اختر سيارة لترى مواصفاتها الكاملة، ثم اطلب تاريخها.',
    sample: 'معاينة: هذه إعلانات تجريبية بصور توضيحية. ستظهر هنا سياراتك وأسعارك الحقيقية.',
    byType: 'التصفية حسب النوع', byBrand: 'التصفية حسب العلامة', all: 'الكل', allBrands: 'كل العلامات', order: 'الترتيب',
    sorts: { showroom: 'ترتيب المعرض', 'price-desc': 'السعر من الأعلى', 'price-asc': 'السعر من الأدنى', 'year-desc': 'الأحدث أولاً' },
    empty: 'سيارات جديدة في الطريق. احجز معاينة وسنخبرك أولاً.', none: 'لا توجد سيارة تطابق هذا الاختيار حالياً.', reset: 'اعرض كل السيارات',
    sampleTag: 'تجريبي', reserved: 'محجوزة', specs: 'المواصفات',
  },
  car: {
    all: 'كل السيارات', reservedLine: 'هذه السيارة محجوزة. اطلب منّا أن نُعلمك إن أصبحت متاحة.', book: 'احجز معاينة خاصة', factory: 'مواصفات المصنع', thisCar: 'هذه السيارة',
    rows: ['السنة', 'المسافة المقطوعة', 'اللون', 'المالكون السابقون', 'سجلّ الصيانة', 'أوراق الاستيراد'], ask: 'عند الطلب',
    specLabels: { Engine: 'المحرّك', Power: 'القوة', Torque: 'عزم الدوران', Gearbox: 'ناقل الحركة', Drive: 'الدفع', '0 to 100 km/h': 'من 0 إلى 100 كم/س', '0 to 97 km/h': 'من 0 إلى 97 كم/س', 'Top speed': 'السرعة القصوى' },
    note: 'أرقام المصنع تخصّ الطراز وقد تختلف حسب السنة والسوق. اطلب منّا مطابقتها مع أوراق هذه السيارة.',
    next: 'السيارة التالية', photos: 'الصور:', unsplash: ' على Unsplash', km: 'كم',
    gallery: { sample: 'إعلان تجريبي', reserved: 'محجوزة', photo: 'اعرض الصورة', video: 'شغّل الفيديو', videoOf: 'فيديو {name}' },
  },
  brands: { label: 'المعرض', title: 'العلامات', text: 'العلامات الموجودة في معرضنا. اختر واحدة لترى سياراتها.', count: (n: number) => (n === 1 ? 'سيارة واحدة معروضة' : n === 2 ? 'سيارتان معروضتان' : `${n} سيارات معروضة`), see: 'شاهد السيارات', all: 'كل العلامات', every: (name: string) => `كل سيارات ${name} في معرضنا. اختر سيارة لترى مواصفاتها الكاملة، ثم اطلب تاريخها.` },
  about: { label: 'عن ميلكار', title: 'لكل سيارة قصة.', text: 'ميلكار للاستشارات في عالم السيارات. سيارات خارقة وفاخرة، بتاريخها الكامل على الطاولة. ونحن نُريك إياها كاملة.', inventory: 'شاهد سياراتنا', book: 'احجز معاينة خاصة' },
  contact: { label: 'تواصل معنا', title: 'تعال وشاهد السيارة.', text: 'أخبرنا أيّ سيارة تريد أن ترى وسنرتّب لك معاينة خاصة.', showroom: 'المعرض', address: 'العنوان', hours: 'ساعات العمل', phone: 'الهاتف', whatsapp: 'واتساب', email: 'البريد الإلكتروني', instagram: 'إنستغرام', hello: 'مرحباً ميلكار،' },
  viewing: { label: 'معاينة خاصة', title: 'شاهد السيارة وأوراقها.', text: 'معاً، جنباً إلى جنب، قبل أي حديث عن السعر.' },
  missing: { page: 'هذه الصفحة غير موجودة.', pageLine: 'ربما انتقلت. المعرض ما زال مفتوحاً.', pageBtn: 'شاهد سياراتنا', car: 'لم نجد هذه السيارة.', carLine: 'ربما بيعت. شاهد ما في المعرض الآن.', carBtn: 'العودة إلى السيارات' },
  common: { priceOnRequest: 'السعر عند الطلب', days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], skip: 'انتقل إلى المحتوى' },
  bodyTypes: { supercar: 'سيارات خارقة', sports_car: 'سيارات رياضية', suv: 'سيارات رياضية متعددة الاستخدامات', sedan: 'سيدان', coupe: 'كوبيه', convertible: 'مكشوفة', grand_tourer: 'غران توريزمو', pickup: 'بيك أب', classic: 'كلاسيكية', other: 'أخرى' },
};

export const WORDS: Record<Locale, Words> = { en, fr, ar };
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

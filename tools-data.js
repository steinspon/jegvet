(function () {
  'use strict';

  // Single source of truth for the tool catalogue, shared by tools.html
  // (navigation) and search.html (search index). Add a calculator here once
  // and it is picked up by both the Tools page and Search automatically.
  window.JEGVET_TOOLS_VIEWS = {
    root: {
      type: 'group',
      labels: { en: 'Tools & Calculators', no: 'Verktøy og kalkulatorer' },
      children: ['group_exotics', 'group_dog', 'group_cat', 'group_meds', 'group_euthanasia']
    },
    group_exotics: {
      type: 'group',
      labels: { en: 'Exotics', no: 'Exotics' },
      children: ['sub_reptiles', 'sub_birds', 'sub_rabbit', 'sub_guinea', 'sub_chinchilla', 'sub_rat', 'sub_other_rodents']
    },
    group_dog: {
      type: 'group',
      labels: { en: 'Dog', no: 'Hund' },
      children: ['tool_dog_antihistamine', 'tool_dog_b1', 'tool_dog_premed', 'tool_ketofol']
    },
    group_cat: {
      type: 'group',
      labels: { en: 'Cat', no: 'Katt' },
      children: ['tool_cat_heart', 'tool_cat_hcm', 'tool_ketofol', 'tool_kitty_magic']
    },
    group_meds: {
      type: 'group',
      labels: { en: 'Medicine Dilutions and Solutions', no: 'Medisinfortynninger og-løsninger' },
      children: ['tool_suspension', 'tool_medicated_water']
    },
    group_euthanasia: {
      type: 'group',
      labels: { en: 'Euthanasia', no: 'Avliving' },
      children: ['tool_euthanasia', 'tool_bird_euthanasia', 'tool_rat_euthanasia']
    },
    sub_reptiles: {
      type: 'group',
      labels: { en: 'Reptiles', no: 'Reptiler' },
      children: ['tool_snake']
    },
    sub_birds: {
      type: 'group',
      labels: { en: 'Birds', no: 'Fugl' },
      children: ['tool_bird_euthanasia', 'sub_birds_wild', 'sub_birds_pet']
    },
    sub_birds_wild: {
      type: 'group',
      labels: { en: 'Wild birds', no: 'Ville fugler' },
      children: ['tool_seagull']
    },
    sub_birds_pet: {
      type: 'group',
      labels: { en: 'Pet birds', no: 'Burfugl' },
      children: []
    },
    sub_rabbit: {
      type: 'group',
      labels: { en: 'Rabbit', no: 'Kanin' },
      children: ['tool_rabbit', 'tool_rabbit_gi_stasis', 'tool_rabbit_upper_airway', 'tool_rabbit_critical_care']
    },
    sub_guinea: {
      type: 'group',
      labels: { en: 'Guinea pig', no: 'Marsvin' },
      children: ['tool_guinea']
    },
    sub_chinchilla: {
      type: 'group',
      labels: { en: 'Chinchilla', no: 'Chinchilla' },
      children: ['tool_chinchilla']
    },
    sub_rat: {
      type: 'group',
      labels: { en: 'Rat', no: 'Rotte' },
      children: ['jump_to_meds', 'tool_rat_euthanasia']
    },
    sub_other_rodents: {
      type: 'group',
      labels: { en: 'Other rodents', no: 'Andre gnagere' },
      children: ['jump_to_meds']
    },
    jump_to_meds: {
      type: 'jump',
      target: 'group_meds'
    },
    tool_chinchilla: {
      type: 'tool',
      href: 'anaesthetic-chinchilla-calculator.html',
      labels: { en: 'Anaesthetic, Chinchilla', no: 'Anestesi, chinchilla' }
    },
    tool_guinea: {
      type: 'tool',
      href: 'anaesthetic-guinea-pig-calculator.html',
      labels: { en: 'Anaesthetic, Guinea pig', no: 'Anestesi, marsvin' }
    },
    tool_rabbit: {
      type: 'tool',
      href: 'anaesthetic-rabbit-calculator.html',
      labels: { en: 'Anaesthetic, Rabbit', no: 'Anestesi, kanin' }
    },
    tool_rabbit_gi_stasis: {
      type: 'tool',
      href: 'rabbit-gi-stasis-calculator.html',
      labels: { en: 'Rabbit GI Stasis Treatment', no: 'Tarmlammelse behandling' }
    },
    tool_snake: {
      type: 'tool',
      href: 'anaesthetic-snake-calculator.html',
      labels: { en: 'Anaesthetic, Snake', no: 'Anestesi, slange' }
    },
    tool_rabbit_upper_airway: {
      type: 'tool',
      href: 'rabbit-upper-airway-disease-calculator.html',
      labels: { en: 'Rabbit Upper Airway Disease', no: 'Øvre luftveissykdom Kanin' }
    },
    tool_rabbit_critical_care: {
      type: 'tool',
      href: 'rabbit-critical-care-calculator.html',
      labels: { en: 'Rabbit Critical Care Calculator', no: 'Critical Care-kalkulator' }
    },
    tool_bird_euthanasia: {
      type: 'tool',
      href: 'bird-euthanasia-calculator.html',
      labels: { en: 'Bird Euthanasia', no: 'Avliving fugl' }
    },
    tool_cat_heart: {
      type: 'tool',
      href: 'cat-heart-protocol-sedation-calculator.html',
      labels: { en: 'Cat Heart Protocol Sedation', no: 'Katt hjerteprotokoll sedasjon' }
    },
    tool_cat_hcm: {
      type: 'tool',
      href: 'cat-hcm-sedation-calculator.html',
      labels: { en: 'Cat HCM Sedation', no: 'Anestesi HCM katt' }
    },
    tool_dog_antihistamine: {
      type: 'tool',
      href: 'dog-antihistamine-calculator.html',
      labels: { en: 'Dog Antihistamine', no: 'Hund antihistamin' }
    },
    tool_dog_premed: {
      type: 'tool',
      href: 'dog-premed-calculator.html',
      labels: { en: 'Dog Premed', no: 'Hund premed' }
    },
    tool_dog_b1: {
      type: 'tool',
      href: 'dog-b1-cardiac-sedation-calculator.html',
      labels: { en: 'Dog B1 Cardiac Sedation', no: 'Hund B1 hjertesedasjon' }
    },
    tool_euthanasia: {
      type: 'tool',
      href: 'euthanasia-calculator.html',
      labels: { en: 'Dog/Cat Euthanasia', no: 'Avliving hund/katt' }
    },
    tool_rat_euthanasia: {
      type: 'tool',
      href: 'rat-euthanasia-calculator.html',
      labels: { en: 'Rat Euthanasia Protocol', no: 'Avliving rotte' }
    },
    tool_ketofol: {
      type: 'tool',
      href: 'ketofol-mixing-calculator.html',
      labels: { en: 'Ketofol Mixing', no: 'Ketofol blanding' }
    },
    tool_kitty_magic: {
      type: 'tool',
      href: 'kitty-magic-calculator.html',
      labels: { en: 'Kitty Magic calculator', no: 'Kitty Magic kalkulator' }
    },
    tool_medicated_water: {
      type: 'tool',
      href: 'medicated-drinking-water-calculator.html',
      labels: { en: 'Medicated Drinking Water', no: 'Medisinert drikkevann' }
    },
    tool_seagull: {
      type: 'tool',
      href: 'seagull-sedation-calculator.html',
      labels: { en: 'Seagull Sedation', no: 'Måke sedasjon' }
    },
    tool_suspension: {
      type: 'tool',
      href: 'suspension-calculator.html',
      labels: { en: 'Suspension', no: 'Løsning for mikstur' }
    }
  };
})();

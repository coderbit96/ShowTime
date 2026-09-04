export type KolkataCinema = {
  name: string;
  locality: string;
  address: string;
};

// Kolkata and its immediately adjoining cinema market. Keep this directory as
// a discovery list only; a cinema becomes bookable when an active Show exists
// for it in MongoDB.
export const kolkataCinemas: KolkataCinema[] = [
  {
    name: "INOX: South City",
    locality: "Prince Anwar Shah Road",
    address: "South City Mall, 375 Prince Anwar Shah Road, Kolkata",
  },
  {
    name: "INOX: Quest Mall",
    locality: "Ballygunge",
    address: "Quest Mall, Syed Amir Ali Avenue, Kolkata",
  },
  {
    name: "INOX: City Centre",
    locality: "Salt Lake",
    address: "City Centre, DC Block, Sector I, Salt Lake",
  },
  {
    name: "INOX: City Centre II",
    locality: "New Town",
    address: "City Centre II, New Town, Rajarhat",
  },
  {
    name: "INOX: Forum Mall",
    locality: "Elgin Road",
    address: "Forum Mall, Elgin Road, Kolkata",
  },
  {
    name: "INOX: Metro",
    locality: "Esplanade",
    address: "5 Jawaharlal Nehru Road, Kolkata",
  },
  {
    name: "INOX: Swabhumi",
    locality: "Swabhumi",
    address: "89C Maulana Abul Kalam Azad Sarani, Kolkata",
  },
  {
    name: "INOX: Star Mall",
    locality: "Madhyamgram",
    address: "Star Mall, Jessore Road, Madhyamgram",
  },
  {
    name: "INOX: Forum Rangoli Mall",
    locality: "Belur",
    address: "Forum Rangoli Mall, Girish Ghosh Road, Belur",
  },
  {
    name: "Hind INOX",
    locality: "Chandni Chowk",
    address: "76 Ganesh Chandra Avenue, Kolkata",
  },
  {
    name: "PVR: Mani Square Mall",
    locality: "EM Bypass",
    address: "Mani Square Mall, 164/1 EM Bypass, Kolkata",
  },
  {
    name: "PVR: Diamond Plaza",
    locality: "Jessore Road",
    address: "Diamond Plaza, 68 Jessore Road, Kolkata",
  },
  {
    name: "PVR: Avani",
    locality: "Howrah",
    address: "Avani Riverside Mall, Jagat Banerjee Ghat Road, Howrah",
  },
  {
    name: "Cinepolis: Acropolis Mall",
    locality: "Rajdanga",
    address: "Acropolis Mall, 1858 Rajdanga Main Road, Kolkata",
  },
  {
    name: "Cinepolis: Lake Mall",
    locality: "Rashbehari",
    address: "Lake Mall, 104 Rashbehari Avenue, Kolkata",
  },
  {
    name: "Miraj Cinemas: The Terminus",
    locality: "New Town",
    address: "The Terminus, BG/12 AA-1B, New Town",
  },
  {
    name: "Miraj Cinemas: Downtown Mall",
    locality: "Salt Lake",
    address: "Downtown Mall, Sector III, Salt Lake",
  },
  {
    name: "Miraj Cinemas: Aurbindo Mall",
    locality: "Howrah",
    address: "Aurobindo Mall, Sri Aurobindo Road, Howrah",
  },
  {
    name: "RDB Cinemas",
    locality: "Salt Lake Sector V",
    address: "K-1 Block EP-GP, Sector V, Salt Lake",
  },
  {
    name: "Bioscope: Axis Mall",
    locality: "New Town",
    address: "Axis Mall, CF Block, New Town",
  },
  {
    name: "SSR Globe Cinemas",
    locality: "New Market",
    address: "Globe Mall, 7E Lindsay Street, Kolkata",
  },
  {
    name: "SSR Ajanta Cinema",
    locality: "Behala",
    address: "30 Diamond Harbour Road, Behala",
  },
  {
    name: "SSR Cinemas: Suncity Mall",
    locality: "Barasat",
    address: "Suncity Mall, Jessore Road, Barasat",
  },
  {
    name: "SSR Cinemas: Maheshtala",
    locality: "Maheshtala",
    address: "Purti Plaza, Budge Budge Trunk Road, Maheshtala",
  },
  {
    name: "SVF Cinemas: Wood Square Mall",
    locality: "Narendrapur",
    address: "Wood Square Mall, 169 NSC Bose Road, Narendrapur",
  },
  {
    name: "SVF Cinemas: Platina Mall",
    locality: "Howrah",
    address: "Platina Mall, Nityadhan Mukherjee Road, Howrah",
  },
  {
    name: "SVF Cinemas: Baruipur Show House",
    locality: "Baruipur",
    address: "Baruipur Show House, Puratan Bazaar, Baruipur",
  },
  {
    name: "Jaya Cinemas: City Mall",
    locality: "Barasat",
    address: "City Mall, 1/3 Jessore Road, Barasat",
  },
  {
    name: "Elora Multiplex",
    locality: "Baruipur",
    address: "Baruipur-Champahati Road, Baruipur",
  },
  {
    name: "Rathindra Multiplex",
    locality: "Sodepur",
    address: "41 RN Avenue, Sodepur",
  },
  {
    name: "Nandan",
    locality: "Maidan",
    address: "Nandan West Bengal Film Centre, 1/1 AJC Bose Road",
  },
  {
    name: "Nazrultirtha Cinema",
    locality: "New Town",
    address: "Biswa Bangla Sarani, New Town",
  },
  {
    name: "Priya Cinema",
    locality: "Rashbehari",
    address: "95 Rashbehari Avenue, Kolkata",
  },
  {
    name: "Navina Cinema",
    locality: "Tollygunge",
    address: "85 Prince Anwar Shah Road, Tollygunge",
  },
  {
    name: "Basusree Cinema",
    locality: "Kalighat",
    address: "102 SP Mukherjee Road, Kolkata",
  },
  {
    name: "Menoka Cinema",
    locality: "Kalighat",
    address: "5 Sarat Chatterjee Avenue, Kolkata",
  },
  {
    name: "Bijoli Cinema",
    locality: "Bhawanipur",
    address: "39 SP Mukherjee Road, Kolkata",
  },
  {
    name: "New Empire Cinema",
    locality: "New Market",
    address: "1 and 2 Humayun Place, Kolkata",
  },
  {
    name: "Prachi Cinema",
    locality: "AJC Bose Road",
    address: "124/A AJC Bose Road, Kolkata",
  },
  {
    name: "Minar Cinema",
    locality: "Hatibagan",
    address: "136/2 Bidhan Sarani, Kolkata",
  },
  {
    name: "Binodini Theatre (Star Theatre)",
    locality: "Sovabazar",
    address: "79/3/4 Bidhan Sarani, Kolkata",
  },
  {
    name: "Asoka Cinema",
    locality: "Behala",
    address: "905/2 Diamond Harbour Road, Behala",
  },
  {
    name: "Radha Studio",
    locality: "Tollygunge",
    address: "72 Deshpran Sasmal Road, Kolkata",
  },
  {
    name: "Atindra Cinema",
    locality: "Barrackpore",
    address: "91-73 Ghosh Para Road, Barrackpore",
  },
  {
    name: "Jayanti Cinema",
    locality: "Barrackpore",
    address: "2 BT Road, Barrackpore Chiriamore",
  },
  {
    name: "Amala Cinema",
    locality: "Barrackpore",
    address: "82 Barrackpore-Barasat Road, Barrackpore",
  },
  {
    name: "Lali Cinema",
    locality: "Barasat",
    address: "Krishnanagar Road, Barasat",
  },
  {
    name: "Padma Cinema",
    locality: "Sodepur",
    address: "Barasat Road, Sodepur",
  },
  {
    name: "Sonali Cinema",
    locality: "Dakshineswar",
    address: "140 Barrackpore Trunk Road, Dakshineswar",
  },
  {
    name: "Rupmandir Cinema",
    locality: "Belghoria",
    address: "40 Indrapuri, Feeder Road, Belghoria",
  },
  {
    name: "Utpal Dutta Mancha",
    locality: "Maheshtala",
    address: "Biren Roy Road West, Maheshtala",
  },
  {
    name: "Uma Talkies",
    locality: "Bakhrahat",
    address: "Roypur Road, Bakhrahat",
  },
  {
    name: "Lila Cinema",
    locality: "Champahati",
    address: "Baruipur-Champahati-Ghatakpukur Road, Champahati",
  },
];

export const INDIAN_STATES = [
  { code: 'AN', name: 'Andaman and Nicobar Islands' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'CG', name: 'Chhattisgarh' },
  { code: 'DL', name: 'Delhi' },
  { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'HR', name: 'Haryana' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JK', name: 'Jammu and Kashmir' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OD', name: 'Odisha' },
  { code: 'PY', name: 'Puducherry' },
  { code: 'PB', name: 'Punjab' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TS', name: 'Telangana' },
  { code: 'TR', name: 'Tripura' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'UK', name: 'Uttarakhand' },
  { code: 'WB', name: 'West Bengal' },
];

export const LGD_DATA = {
  GJ: {
    districts: [
      {
        name: 'Ahmedabad',
        subDistricts: [
          { name: 'Ahmadabad City', villages: ['Ahmadabad (M Corp.)', 'Bopal (M)'] },
          { name: 'Daskroi', villages: ['Aslali', 'Bareja', 'Bhuvaldi', 'Hathijan'] },
          { name: 'Sanand', villages: ['Sanand (M)', 'Chekhla', 'Goraj'] }
        ]
      },
      {
        name: 'Surat',
        subDistricts: [
          { name: 'Surat City', villages: ['Surat (M Corp.)'] },
          { name: 'Choryasi', villages: ['Hazira', 'Kawas', 'Ichhapore'] },
          { name: 'Kamrej', villages: ['Kamrej', 'Kathor'] }
        ]
      },
      {
        name: 'Vadodara',
        subDistricts: [
          { name: 'Vadodara', villages: ['Vadodara (M Corp.)', 'Bhaili', 'Koyali'] },
          { name: 'Savli', villages: ['Savli', 'Manjusar'] }
        ]
      }
    ]
  },
  MH: {
    districts: [
      {
        name: 'Mumbai',
        subDistricts: [
          { name: 'Mumbai City', villages: ['Mumbai (M Corp.)'] }
        ]
      },
      {
        name: 'Pune',
        subDistricts: [
          { name: 'Pune City', villages: ['Pune (M Corp.)'] },
          { name: 'Haveli', villages: ['Pimpri Chinchwad', 'Wagholi', 'Khadakwasla'] }
        ]
      }
    ]
  }
};

const https = require('https');
const url = 'https://apitransporte.buenosaires.gob.ar/colectivos/vehiclePositions?client_id=b21111693b9d4819a2d768c1083f7441&client_secret=8F166ECD08C44F21869902ba11CD30A1&json=1';
https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const entities = json._entity || json.entity;
      const occupancies = new Set();
      entities.forEach(e => {
        const v = e._vehicle || e.vehicle;
        const occ = v._occupancy_status !== undefined ? v._occupancy_status : v.occupancy_status;
        occupancies.add(occ);
      });
      console.log(Array.from(occupancies));
    } catch (e) {
      console.log(e);
    }
  });
});

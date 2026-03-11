import https from 'https';

const url = 'https://apitransporte.buenosaires.gob.ar/colectivos/vehiclePositions?client_id=b21111693b9d4819a2d768c1083f7441&client_secret=8F166ECD08C44F21869902ba11CD30A1&json=1';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
    if (data.length > 5000) {
      res.destroy(); // Stop downloading after we have enough
      try {
        const parsed = JSON.parse(data + ']}'); // Might be broken JSON, let's just regex it
      } catch (e) {}
      console.log(data.substring(0, 2000));
    }
  });
}).on('error', (err) => {
  console.log('Error: ', err.message);
});

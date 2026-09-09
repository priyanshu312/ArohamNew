const router = require("express").Router();
const geoTz = require("geo-tz");
const moment = require("moment-timezone");
const { compileAstrologyPdf } = require("../services/kundli/pdfService");
const avakhadaLookup = require("../services/kundli/avakhada_lookup.json");
const { kundliLimiter } = require("../middleware/rateLimit");

router.post("/generate", kundliLimiter, async (req, res) => {
  const { name = "Devotee", gender = "Male", location, date, time } = req.body;

  if (!location || !date || !time) {
    return res.status(400).json({ error: "location, date (DD/MM/YYYY), and time (HH:MM) are required" });
  }

  try {
    console.log(`[Kundli API] Generating Kundli PDF for ${name} (${location}, ${date} ${time})...`);

    // 1. Fetch exact geographic coordinates
    const encodedLoc = encodeURIComponent(location);
    const geoUrl = `https://api.vedastro.org/api/Calculate/AddressToGeoLocation/Address/${encodedLoc}`;
    const geoRes = await fetch(geoUrl);
    
    let resolvedLoc = { Name: location, Latitude: "28.6139", Longitude: "77.2090" }; // Default Delhi fallback
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData?.Payload?.AddressToGeoLocation) {
        resolvedLoc = {
          Name: geoData.Payload.AddressToGeoLocation.Name || location,
          Longitude: String(geoData.Payload.AddressToGeoLocation.Longitude || "77.2090"),
          Latitude: String(geoData.Payload.AddressToGeoLocation.Latitude || "28.6139")
        };
      }
    }

    // 2. Calculate timezone dynamically
    let timezone = "+05:30";
    if (resolvedLoc.Latitude && resolvedLoc.Longitude) {
      try {
        const tzName = geoTz.find(parseFloat(resolvedLoc.Latitude), parseFloat(resolvedLoc.Longitude))[0];
        if (tzName) {
          const [day, month, year] = date.split('/');
          const m = moment.tz(`${year}-${month}-${day} ${time}`, 'YYYY-MM-DD HH:mm', tzName);
          timezone = m.format('Z');
        }
      } catch (e) {
        console.error("[Kundli API] Timezone detection error:", e.message);
      }
    }

    // 3. Prepare VedAstro calculation endpoints
    const baseUrl = `https://api.vedastro.org/api/Calculate`;
    const cleanDate = date.replace(/\//g, '/');
    const encodedResolvedName = encodeURIComponent(resolvedLoc.Name);
    const locTimeParams = `Location/${encodedResolvedName}/Time/${time}/${cleanDate}/${timezone}`;

    console.log(`[Kundli API] Querying VedAstro calculations for ${locTimeParams}...`);

    const [
      planetRes,
      houseRes,
      tithiRes,
      yogaRes,
      karanaRes,
      sunriseRes,
      sunsetRes,
      moonNakshatraRes,
      uranusRes,
      neptuneRes,
      plutoRes
    ] = await Promise.all([
      fetch(`${baseUrl}/AllPlanetData/PlanetName/All/${locTimeParams}`),
      fetch(`${baseUrl}/AllHouseData/HouseName/All/${locTimeParams}`),
      fetch(`${baseUrl}/Tithi/${locTimeParams}`),
      fetch(`${baseUrl}/NithyaYoga/${locTimeParams}`),
      fetch(`${baseUrl}/Karana/${locTimeParams}`),
      fetch(`${baseUrl}/SunriseTime/${locTimeParams}`),
      fetch(`${baseUrl}/SunsetTime/${locTimeParams}`),
      fetch(`${baseUrl}/MoonNakshatra/${locTimeParams}`),
      fetch(`${baseUrl}/AllPlanetData/PlanetName/Uranus/${locTimeParams}`),
      fetch(`${baseUrl}/AllPlanetData/PlanetName/Neptune/${locTimeParams}`),
      fetch(`${baseUrl}/AllPlanetData/PlanetName/Pluto/${locTimeParams}`)
    ]);

    const planetData = await planetRes.json().catch(() => ({}));
    const houseData = await houseRes.json().catch(() => ({}));
    const tithiData = await tithiRes.json().catch(() => ({}));
    const yogaData = await yogaRes.json().catch(() => ({}));
    const karanaData = await karanaRes.json().catch(() => ({}));
    const sunriseData = await sunriseRes.json().catch(() => ({}));
    const sunsetData = await sunsetRes.json().catch(() => ({}));
    const moonNakshatraData = await moonNakshatraRes.json().catch(() => ({}));
    
    const uranusData = await uranusRes.json().catch(() => ({}));
    const neptuneData = await neptuneRes.json().catch(() => ({}));
    const plutoData = await plutoRes.json().catch(() => ({}));

    const allPlanetsList = planetData?.Payload?.AllPlanetData || [];
    if (uranusData?.Payload) allPlanetsList.push(uranusData.Payload.Uranus || Object.values(uranusData.Payload)[0] ? { "Uranus": uranusData.Payload.Uranus || Object.values(uranusData.Payload)[0] } : null);
    if (neptuneData?.Payload) allPlanetsList.push(neptuneData.Payload.Neptune || Object.values(neptuneData.Payload)[0] ? { "Neptune": neptuneData.Payload.Neptune || Object.values(neptuneData.Payload)[0] } : null);
    if (plutoData?.Payload) allPlanetsList.push(plutoData.Payload.Pluto || Object.values(plutoData.Payload)[0] ? { "Pluto": plutoData.Payload.Pluto || Object.values(plutoData.Payload)[0] } : null);
    
    const finalPlanetList = allPlanetsList.filter((p) => p != null);

    // 4. Calculate Avakhada details
    let moonNakshatraName = 'Unknown';
    let moonCharan = 1;
    let signLord = 'Unknown';
    let moonSign = 'Unknown';
    let moonHouse = 1;

    try {
      const moonNakStr = moonNakshatraData?.Payload?.MoonNakshatra || '';
      const parts = moonNakStr.split('-');
      moonNakshatraName = parts[0]?.trim() || 'Unknown';
      if (parts[1]) moonCharan = parseInt(parts[1].trim()) || 1;

      const houseList = houseData?.Payload?.AllHouseData || [];
      const moonObj = finalPlanetList.find((p) => p && p.Moon);
      
      if (moonObj && moonObj.Moon) {
        if (moonObj.Moon.PlanetRasiD1Sign) moonSign = moonObj.Moon.PlanetRasiD1Sign.Name;
        if (moonObj.Moon.PlanetLordOfZodiacSign) signLord = moonObj.Moon.PlanetLordOfZodiacSign.Name;
      }

      let lagnaSignName = 'Aries';
      const lagnaHouse = houseList.find((h) => h && h.House1);
      if (lagnaHouse && lagnaHouse.House1.HouseRasiSign) {
        lagnaSignName = lagnaHouse.House1.HouseRasiSign.Name;
      }

      const ZODIAC_SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
      const lagnaIndex = ZODIAC_SIGNS.indexOf(lagnaSignName);
      const moonSignIndex = ZODIAC_SIGNS.indexOf(moonSign);
      if (lagnaIndex !== -1 && moonSignIndex !== -1) {
        moonHouse = ((moonSignIndex - lagnaIndex + 12) % 12) + 1;
      }
    } catch(e) {
      console.error("[Kundli API] Avakhada calculation error:", e);
    }

    let paya = 'Unknown';
    if ([1, 6, 11].includes(moonHouse)) paya = 'Loha (Iron)';
    else if ([3, 7, 10].includes(moonHouse)) paya = 'Tamra (Copper)';
    else if ([2, 5, 9].includes(moonHouse)) paya = 'Rajat (Silver)';
    else if ([4, 8, 12].includes(moonHouse)) paya = 'Swarna (Gold)';

    const nakProps = (avakhadaLookup.Nakshatra)[moonNakshatraName] || {};
    const rashiProps = (avakhadaLookup.Rashi)[moonSign] || {};
    
    let nameAlphabet = 'Unknown';
    if (nakProps.Syllables && nakProps.Syllables.length >= moonCharan) {
      nameAlphabet = nakProps.Syllables[moonCharan - 1];
    }

    const avakhada = {
      Nakshatra: moonNakshatraName,
      Charan: moonCharan,
      NameAlphabet: nameAlphabet,
      Sign: moonSign,
      SignLord: signLord,
      Paya: paya,
      Yunja: nakProps.Yunja || 'Unknown',
      Gan: nakProps.Gan || 'Unknown',
      Nadi: nakProps.Nadi || 'Unknown',
      Yoni: nakProps.Yoni || 'Unknown',
      Varna: rashiProps.Varna || 'Unknown',
      Tatva: rashiProps.Tatva || 'Unknown'
    };

    const rawChartData = {
      ResolvedExactLocation: resolvedLoc,
      Panchang: {
        Tithi: tithiData?.Payload?.Tithi || 'Unknown',
        Yoga: yogaData?.Payload?.NithyaYoga || 'Unknown',
        Karana: karanaData?.Payload?.Karana || 'Unknown',
        Sunrise: sunriseData?.Payload?.SunriseTime || 'Unknown',
        Sunset: sunsetData?.Payload?.SunsetTime || 'Unknown',
        MoonNakshatra: moonNakshatraName,
        Avakhada: avakhada
      },
      ChartData: {
        AllPlanetData: finalPlanetList,
        AllHouseData: houseData?.Payload?.AllHouseData || []
      }
    };

    // Save derived Kundali profile into global cache for astrological recommendation boosting
    const { getDerivedAstrologyProfile } = require("../services/kundliScoring");
    const activeDasha = avakhada.SignLord === "Saturn" ? "Saturn" : (avakhada.SignLord || "Saturn");
    const derivedProfile = getDerivedAstrologyProfile(activeDasha, moonSign, moonNakshatraName);
    
    global.kundaliProfiles[name] = derivedProfile;
    if (req.body.userId) {
      global.kundaliProfiles[req.body.userId] = derivedProfile;
    }
    console.log(`[Kundli API] Derived profile cached for ${name}: Dasha ${derivedProfile.mahadasha}, Moon: ${derivedProfile.moonSign}`);

    const defaultInsights = `Dynamic Kundli charts generated for ${name} based on birth details: Date: ${date}, Time: ${time}, Location: ${resolvedLoc.Name}.`;

    // 5. Compile PDF Buffer
    console.log("[Kundli API] Compiling PDF report...");
    const pdfBuffer = await compileAstrologyPdf(rawChartData, time, date, name, defaultInsights, gender);

    // 6. Return PDF file response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Kundli-${name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error("[Kundli API Error]:", err);
    res.status(500).json({ error: "Failed to generate Kundli PDF", details: err.message });
  }
});

module.exports = router;

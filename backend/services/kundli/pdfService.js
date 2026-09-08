"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileAstrologyPdf = compileAstrologyPdf;
const puppeteer_1 = __importDefault(require("puppeteer"));
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const marked_1 = require("marked");
const kpEngine_1 = require("./kpEngine");
const kpCusps_1 = require("./kpCusps");
const ashtakvargaEngine_1 = require("./ashtakvargaEngine");
const dashaEngine_1 = require("./dashaEngine");
const avakhadaEngine_1 = require("./avakhadaEngine");
const ZODIAC_SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];
function buildNorthIndianChart(allPlanetData, allHouseData, signKey, houseKey, overrideLagnaSign) {
    const layout = {};
    for (let i = 1; i <= 12; i++)
        layout[i] = { signNum: 0, planets: [] };
    // 1. Find Ascendant Sign
    let lagnaSignName = 'Aries';
    if (overrideLagnaSign) {
        lagnaSignName = overrideLagnaSign;
    }
    else {
        const lagnaHouse = allHouseData.find((h) => h.House1);
        if (lagnaHouse && lagnaHouse.House1[houseKey]) {
            lagnaSignName = lagnaHouse.House1[houseKey].Name;
        }
    }
    const lagnaIndex = ZODIAC_SIGNS.indexOf(lagnaSignName);
    // 2. Map Signs to Houses
    for (let i = 0; i < 12; i++) {
        const signIndex = (lagnaIndex + i) % 12;
        const houseNum = i + 1;
        layout[houseNum].signNum = signIndex + 1; // 1-based (Aries=1)
    }
    // 3. Place Planets in Houses based on their Sign
    allPlanetData.forEach((p) => {
        const planetName = Object.keys(p)[0];
        const planetData = p[planetName];
        if (planetData[signKey]) {
            const planetSign = planetData[signKey].Name;
            const pIndex = ZODIAC_SIGNS.indexOf(planetSign);
            // Find which house this sign maps to
            const houseNum = ((pIndex - lagnaIndex + 12) % 12) + 1;
            const shortName = planetName.substring(0, 2);
            layout[houseNum].planets.push(shortName);
        }
    });
    layout[1].planets.push('Asc');
    return layout;
}
function buildKPChalitChart(kpCusps, formattedPlanets) {
    const layout = {};
    for (let i = 1; i <= 12; i++)
        layout[i] = { signNum: 0, planets: [] };
    if (!kpCusps || kpCusps.length !== 12)
        return layout;
    // Determine the sign of each house cusp (for the numbers in the center)
    // Actually, in KP Chalit, the sign number in a house box usually corresponds to the sign the cusp falls in.
    kpCusps.forEach((cusp) => {
        // Find which sign this degree is in
        const signIndex = Math.floor(cusp.degree / 30);
        layout[cusp.houseNumber].signNum = signIndex + 1; // Aries=1
    });
    // Place planets in houses based on degrees
    formattedPlanets.forEach((p) => {
        if (!p.longitude)
            return;
        const pDeg = p.longitude;
        let placed = false;
        for (let i = 0; i < 12; i++) {
            const hNum = i + 1;
            const nextHNum = hNum === 12 ? 1 : hNum + 1;
            const startDeg = kpCusps.find(c => c.houseNumber === hNum)?.degree || 0;
            const endDeg = kpCusps.find(c => c.houseNumber === nextHNum)?.degree || 0;
            if (startDeg < endDeg) {
                if (pDeg >= startDeg && pDeg < endDeg) {
                    layout[hNum].planets.push(p.name.substring(0, 2));
                    placed = true;
                    break;
                }
            }
            else { // Wraps around 360/0
                if (pDeg >= startDeg || pDeg < endDeg) {
                    layout[hNum].planets.push(p.name.substring(0, 2));
                    placed = true;
                    break;
                }
            }
        }
        // Fallback (should never happen if cusps are valid)
        if (!placed) {
            layout[1].planets.push(p.name.substring(0, 2));
        }
    });
    return layout;
}
async function compileAstrologyPdf(chartData, birthTime, birthDate, userName, writtenInsights = '', gender = 'Male') {
    // Extract the resolved location and the raw AllPlanetData array
    const locationObj = chartData.ResolvedExactLocation;
    const allPlanetData = chartData.ChartData?.AllPlanetData || [];
    const allHouseData = chartData.ChartData?.AllHouseData || [];

    // Derive Ascendant (Lagna) details
    let lagnaSignName = 'Aries';
    let lagnaHouseObj = allHouseData.find((h) => h && h.House1);
    if (lagnaHouseObj && lagnaHouseObj.House1 && lagnaHouseObj.House1.HouseRasiSign) {
        lagnaSignName = lagnaHouseObj.House1.HouseRasiSign.Name;
    }

    const ascendantRow = {
        name: "Ascendant (Lagna)",
        sign: lagnaSignName,
        signLord: lagnaHouseObj?.House1?.HouseLordOfRasiSign?.Name || '-',
        nakshatra: lagnaHouseObj?.House1?.HouseConstellation || '-',
        nakshatraLord: lagnaHouseObj?.House1?.HouseLordOfConstellation?.Name || '-',
        retrograde: 'False',
        house: '1',
        degrees: lagnaHouseObj?.House1?.HouseRasiSign?.DegreesIn?.DegreeMinuteSecond || '00° 00′ 00″',
        longitude: (ZODIAC_SIGNS.indexOf(lagnaSignName) * 30 + parseFloat(lagnaHouseObj?.House1?.HouseRasiSign?.DegreesIn?.TotalDegrees || '0')) || 0,
        status: 'Lagna',
        kpSignLord: '-',
        kpStarLord: '-',
        kpSubLord: '-'
    };

    const formattedPlanets = allPlanetData.map((p) => {
        const planetName = Object.keys(p)[0];
        const planetData = p[planetName];
        // KP Calculations
        let kpSignLord = '-';
        let kpStarLord = '-';
        let kpSubLord = '-';
        if (planetData?.PlanetRasiD1Sign?.Name && planetData?.PlanetRasiD1Sign?.DegreesIn?.TotalDegrees) {
            const signIndex = ZODIAC_SIGNS.indexOf(planetData.PlanetRasiD1Sign.Name);
            const degreesInSign = parseFloat(planetData.PlanetRasiD1Sign.DegreesIn.TotalDegrees);
            if (signIndex !== -1 && !isNaN(degreesInSign)) {
                const absLongitude = signIndex * 30 + degreesInSign;
                const kp = (0, kpEngine_1.getKPData)(absLongitude);
                kpSignLord = kp.signLord;
                kpStarLord = kp.starLord;
                kpSubLord = kp.subLord;
            }
        }
        return {
            name: planetName,
            sign: planetData?.PlanetRasiD1Sign?.Name || '-',
            signLord: planetData?.PlanetLordOfZodiacSign?.Name || '-',
            nakshatra: planetData?.PlanetConstellation || '-',
            nakshatraLord: planetData?.PlanetLordOfConstellation?.Name || '-',
            retrograde: planetData?.IsPlanetRetrograde || 'False',
            house: String(planetData?.HousePlanetOccupiesBasedOnSign ?? '').replace('House', '') || '-',
            degrees: planetData?.PlanetRasiD1Sign?.DegreesIn?.DegreeMinuteSecond || '-',
            longitude: (ZODIAC_SIGNS.indexOf(planetData?.PlanetRasiD1Sign?.Name) * 30 + parseFloat(planetData?.PlanetRasiD1Sign?.DegreesIn?.TotalDegrees)) || 0,
            status: planetData?.PlanetStrength ? `Strength: ${parseFloat(planetData.PlanetStrength).toFixed(2)}` : '-',
            kpSignLord,
            kpStarLord,
            kpSubLord
        };
    });

    formattedPlanets.unshift(ascendantRow);
    const shadbalaData = allPlanetData.map((p) => {
        const planetName = Object.keys(p)[0];
        const pd = p[planetName];
        const safeParse = (val) => {
            if (!val || typeof val !== 'string' || val.includes('Exception') || val.includes('Error'))
                return '-';
            const num = parseFloat(val);
            return isNaN(num) ? '-' : num.toFixed(1);
        };
        return {
            name: planetName,
            sthana: safeParse(pd?.PlanetSthanaBala),
            kala: safeParse(pd?.PlanetKalaBala),
            dig: safeParse(pd?.PlanetDigBala),
            naisargika: safeParse(pd?.PlanetNaisargikaBala),
            drik: safeParse(pd?.PlanetDrikBala),
            total: safeParse(pd?.PlanetStrength),
            ishta: safeParse(pd?.PlanetIshtaScore),
            kashta: safeParse(pd?.PlanetKashtaScore)
        };
    });
    const bhavbalaData = allHouseData.map((h) => {
        const houseKey = Object.keys(h)[0]; // e.g. "House1"
        const houseNum = parseInt(houseKey.replace('House', ''));
        const hd = h[houseKey];
        return {
            house: houseNum,
            strength: hd?.HouseStrength ? parseFloat(hd.HouseStrength) : 0,
            category: hd?.HouseStrengthCategory || '-'
        };
    }).sort((a, b) => b.strength - a.strength)
        .map((item, index) => ({ ...item, rank: index + 1 }))
        .sort((a, b) => a.house - b.house); // Sort back by house number for display, but keep the assigned rank
    // No longer need SVG API since we are drawing it native!
    const svgChart = '';
    // Build Divisional Charts (North Indian)
    // Extract Sun and Moon signs for Surya and Chandra Kundli
    let sunSign = 'Aries';
    let moonSign = 'Aries';
    const sunPlanet = allPlanetData.find((p) => Object.keys(p)[0] === 'Sun');
    if (sunPlanet && sunPlanet.Sun.PlanetRasiD1Sign) {
        sunSign = sunPlanet.Sun.PlanetRasiD1Sign.Name;
    }
    const moonPlanetForChart = allPlanetData.find((p) => Object.keys(p)[0] === 'Moon');
    if (moonPlanetForChart && moonPlanetForChart.Moon.PlanetRasiD1Sign) {
        moonSign = moonPlanetForChart.Moon.PlanetRasiD1Sign.Name;
    }
    const d1Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetRasiD1Sign', 'HouseRasiSign');
    const suryaChart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetRasiD1Sign', 'HouseRasiSign', sunSign);
    const chandraChart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetRasiD1Sign', 'HouseRasiSign', moonSign);
    // Priority 2
    const d2Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetHoraD2Signs', 'HouseHoraD2Sign');
    const d3Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetDrekkanaD3Sign', 'HouseDrekkanaD3Sign');
    const d4Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetChaturthamshaD4Sign', 'HouseChaturthamshaD4Sign');
    const d7Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetSaptamshaD7Sign', 'HouseSaptamshaD7Sign');
    const d9Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetNavamshaD9Sign', 'HouseNavamshaD9Sign');
    const d10Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetDashamamshaD10Sign', 'HouseDashamamshaD10Sign');
    const d12Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetDwadashamshaD12Sign', 'HouseDwadashamshaD12Sign');
    // Priority 3
    const d16Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetShodashamshaD16Sign', 'HouseShodashamshaD16Sign');
    const d20Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetVimshamshaD20Sign', 'HouseVimshamshaD20Sign');
    const d24Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetChaturvimshamshaD24Sign', 'HouseChaturvimshamshaD24Sign');
    const d27Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetBhamshaD27Sign', 'HouseBhamshaD27Sign');
    const d30Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetTrimshamshaD30Sign', 'HouseTrimshamshaD30Sign');
    const d40Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetKhavedamshaD40Sign', 'HouseKhavedamshaD40Sign');
    const d45Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetAkshavedamshaD45Sign', 'HouseAkshavedamshaD45Sign');
    const d60Chart = buildNorthIndianChart(allPlanetData, allHouseData, 'PlanetShashtyamshaD60Sign', 'HouseShashtyamshaD60Sign');
    // Ashtakvarga Calculation
    const ascendantPlanet = formattedPlanets.find((p) => p.name === 'Ascendant');
    const ascendantSign = ascendantPlanet ? ascendantPlanet.sign : 'Aries';
    const ashtakvargaData = (0, ashtakvargaEngine_1.calculateAshtakvarga)(formattedPlanets, ascendantSign);
    // Vimshottari Dasha Calculation
    const parts = birthDate.split('/');
    let bDateObj = new Date();
    if (parts.length === 3) {
        bDateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    const moonPlanetForDasha = formattedPlanets.find((p) => p.name === 'Moon');
    const dashaTimeline = moonPlanetForDasha ? (0, dashaEngine_1.calculateVimshottariDasha)(moonPlanetForDasha.longitude, bDateObj) : null;
    const yoginiTimeline = moonPlanetForDasha ? (0, dashaEngine_1.calculateYoginiDasha)(moonPlanetForDasha.longitude, bDateObj) : null;
    const aiInsights = chartData.ai_insights || null;
    const panchang = chartData.Panchang || {};
    if (moonPlanetForDasha && !panchang.Avakhada) {
        panchang.Avakhada = (0, avakhadaEngine_1.getAvakhadaDetails)(moonPlanetForDasha.longitude);
    }
    // Calculate Ascendant KP data
    let ascKpData = { signLord: '-', starLord: '-', subLord: '-' };
    const lagnaHouse = allHouseData.find((h) => h.House1);
    if (lagnaHouse && lagnaHouse.House1?.HouseRasiSign) {
        const ascSign = lagnaHouse.House1.HouseRasiSign.Name;
        const ascDeg = parseFloat(lagnaHouse.House1.HouseRasiSign.DegreesIn.TotalDegrees);
        const signIdx = ZODIAC_SIGNS.indexOf(ascSign);
        if (signIdx !== -1 && !isNaN(ascDeg)) {
            const ascAbs = signIdx * 30 + ascDeg;
            ascKpData = (0, kpEngine_1.getKPData)(ascAbs);
        }
    }
    // Determine Day Lord based on day of week of birth
    // JS Date gets day of week, but we need day of week for the exact location.
    // Simplifying: we'll extract it from the Panchang if available, otherwise fallback.
    // The Panchang object has 'Vara' (Day of week).
    // Let's map Vara to planetary lords.
    const varaLords = {
        'Sunday': 'Sun', 'Monday': 'Moon', 'Tuesday': 'Mars',
        'Wednesday': 'Mercury', 'Thursday': 'Jupiter', 'Friday': 'Venus', 'Saturday': 'Saturn'
    };
    let dayLord = '-';
    // If we have vara from Panchang, use it. But panchang might not have Vara as is.
    // Let's use the Date object to get the day of the week as a fallback.
    if (birthDate) {
        // Date format might be DD/MM/YYYY or YYYY-MM-DD. Let's assume JS can parse standard formats.
        const [d, m, y] = birthDate.split('/');
        const parsedDate = new Date(`${y}-${m}-${d}`);
        if (!isNaN(parsedDate.getTime())) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            dayLord = varaLords[days[parsedDate.getDay()]] || '-';
        }
    }
    const moonPlanet = formattedPlanets.find((p) => p.name === 'Moon');
    const kpRulingPlanets = {
        ascSignLord: ascKpData.signLord,
        ascStarLord: ascKpData.starLord,
        ascSubLord: ascKpData.subLord,
        moonSignLord: moonPlanet ? moonPlanet.kpSignLord : '-',
        moonStarLord: moonPlanet ? moonPlanet.kpStarLord : '-',
        moonSubLord: moonPlanet ? moonPlanet.kpSubLord : '-',
        dayLord: dayLord
    };
    // Calculate Placidus Houses for KP Cuspal Table
    let kpCusps = [];
    if (birthDate && birthTime && locationObj.Latitude && locationObj.Longitude) {
        const [d, m, y] = birthDate.split('/');
        const [hr, min] = birthTime.split(':');
        try {
            kpCusps = (0, kpCusps_1.calculateKPHouses)(parseInt(y), parseInt(m), parseInt(d), parseInt(hr), parseInt(min), parseFloat(locationObj.Latitude), parseFloat(locationObj.Longitude));
        }
        catch (e) {
            console.error('Error calculating KP Cusps:', e);
        }
    }
    const kpChalitChart = buildKPChalitChart(kpCusps, formattedPlanets);
    const templateData = {
        userName: userName,
        gender: gender || 'Male',
        location: locationObj.Name || 'Unknown Location',
        coordinates: `${locationObj.Latitude}, ${locationObj.Longitude}`,
        date: birthDate,
        time: birthTime,
        planets: formattedPlanets,
        svgChart: svgChart, // Deprecated, left for compatibility if needed
        d1Chart: d1Chart,
        suryaChart: suryaChart,
        chandraChart: chandraChart,
        d2Chart: d2Chart,
        d3Chart: d3Chart,
        d4Chart: d4Chart,
        d7Chart: d7Chart,
        d9Chart: d9Chart,
        d10Chart: d10Chart,
        d12Chart: d12Chart,
        d16Chart: d16Chart,
        d20Chart: d20Chart,
        d24Chart: d24Chart,
        d27Chart: d27Chart,
        d30Chart: d30Chart,
        d40Chart: d40Chart,
        d45Chart: d45Chart,
        d60Chart: d60Chart,
        kpCusps: kpCusps,
        kpChalitChart: kpChalitChart,
        insightsHtml: (0, marked_1.marked)(writtenInsights),
        aiInsights: aiInsights,
        panchang: panchang,
        shadbalaData: shadbalaData,
        bhavbalaData: bhavbalaData,
        kpRulingPlanets: kpRulingPlanets,
        ashtakvargaData: ashtakvargaData,
        dashaTimeline: dashaTimeline,
        yoginiTimeline: yoginiTimeline
    };
    // Load EJS template
    const templatePath = path_1.default.join(__dirname, 'renderer', 'kundli_report.ejs');
    const templateString = fs_1.default.readFileSync(templatePath, 'utf-8');
    // Render HTML string
    const htmlContent = ejs_1.default.render(templateString, templateData);
    // Launch Puppeteer and print to PDF
    const browser = await puppeteer_1.default.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
    });
    await browser.close();
    return pdfBuffer;
}

'use client';
import { createContext, useContext, useState, useEffect } from 'react';

/**
 * Lightweight i18n. Client-side context + dictionary. Add keys here and call
 * t('key') / t('key', { var }) from any client component. Falls back to English
 * for missing keys, so partial translation never breaks the UI.
 *
 * NOTE: Hindi/Gujarati strings are a solid first pass — have a native speaker
 * review copy before public launch.
 */
export const LANGS = { en: 'EN', hi: 'हिंदी', gu: 'ગુજરાતી' };

const DICT = {
  en: {
    'wizard.badge': '60-second BWG self-check',
    'wizard.title': 'Not sure if the rules apply to you? Enter three numbers.',
    'wizard.sub': 'Meeting any one threshold makes your facility a Bulk Waste Generator. No sign-up — instant result.',
    'wizard.area': 'Built-up area',
    'wizard.water': 'Water use',
    'wizard.waste': 'Daily waste',
    'wizard.bwgIf': 'BWG if ≥',
    'wizard.check': 'Check my facility',
    'wizard.qualTitle': 'Your facility qualifies as a Bulk Waste Generator.',
    'wizard.qualBody': 'Registration on the CPCB SWM portal is mandatory. You triggered: {x}. Our consultants can file it end-to-end.',
    'wizard.belowTitle': 'You may currently be below the BWG threshold.',
    'wizard.belowBody': 'Thresholds still apply the moment your facility grows — and voluntary registration keeps you audit-ready. Talk to us to be sure.',
    'wizard.startReg': 'Start Registration',
    'wizard.registerVol': 'Register Voluntarily',
    'wizard.talk': 'Talk to a consultant',
    'wizard.disclaimer': 'Indicative self-check only — not a legal determination. Final eligibility is confirmed during consultation.',
    'nav.services': 'Services', 'nav.how': 'How It Works', 'nav.pricing': 'Pricing', 'nav.register': 'Register Now',
    'hero.inforce': 'In force',
    'hero.h1pre': 'Beat the SWM 2026 deadline. Register your waste streams', 'hero.h1hi': 'today',
    'hero.sub': "Mandatory source segregation is here. Don't risk delays. We navigate the portal, file your paperwork across all four waste streams, and secure your official registration so your business is ready for April 1st.",
    'hero.countPre': 'Only', 'hero.countLabel': 'days left until mandatory SWM 2026 compliance (1 April 2026)',
    'hero.inforceAlert': 'SWM Rules 2026 are IN FORCE — unregistered Bulk Waste Generators risk penalties. Register today.',
    'hero.ctaUrgency': "Don't wait for an inspection notice — most filings are completed within 24 hours.",
    'hero.cta1': 'Start Your Registration', 'hero.cta2': 'Talk to a Consultant',
    'hero.trust1': 'Built on the Gazette', 'hero.trust2': 'OTP stays with you', 'hero.trust3': 'LGD verified',
    'hero.mandatory': 'Mandatory from 1 April 2026', 'hero.fourway': 'Four-way source segregation', 'hero.ack': 'ACK Issued',
    'bin.wet': 'Wet', 'bin.dry': 'Dry', 'bin.sanitary': 'Sanitary', 'bin.special': 'Special',
    'footer.tagline': 'CPCB/GPCB SWM 2026 Compliance Middleware.', 'footer.notaffil': 'Not affiliated with any government body.',
    'footer.privacy': 'Privacy Policy', 'footer.terms': 'Terms of Service', 'footer.refund': 'Refund Policy', 'footer.contact': 'Contact', 'footer.track': 'Track filing',
    // hero slider
    'sld.d.badge': 'Annual filing deadline · 30 June', 'sld.d.h': 'The June 30 SWM annual-return deadline is approaching. Is your filing on record?', 'sld.d.sub': 'Bulk Waste Generators must file an annual return with the CPCB/ULB each year by 30 June. Late or missing returns can flag your entity for non-compliance review. Get your filing on record early.', 'sld.d.cta': 'Start My Filing Now', 'sld.d.days': 'Days to next deadline',
    'sld.f.badge': 'Are you a Bulk Waste Generator?', 'sld.f.h': '20,000 sq.m built-up? 40,000 L water daily? 100 kg waste?', 'sld.f.sub': 'Meeting any single one of these criteria legally categorises your facility as a Bulk Waste Generator under Rule 6. 4-stream segregation and real-time digital reporting are now statutory mandates.', 'sld.f.cta': 'Run 60-Second Eligibility Audit',
    'sld.l.badge': 'Legal enforcement', 'sld.l.h': 'Non-compliance can put your water & power connections at risk.', 'sld.l.sub': 'Courts and local bodies have upheld strict action against persistent SWM defaulters — including sealing notices and utility disconnection for non-compliant commercial complexes. Bring your facility into full compliance before an inspection.', 'sld.l.cta': 'Protect Your Facility Operations',
    'sld.s.badge': 'Source segregation', 'sld.s.h': 'The 2-bin system is dead. Welcome to mandatory 4-stream auditing.', 'sld.s.sub': 'Mixing industrial washroom waste, canteen food waste, or expired medical items triggers direct environmental fines. Indian Waste Portal digital ledgers streamline your full source-to-disposal trail.', 'sld.s.cta': 'Explore Automated SWM Workflows',
    'sld.e.badge': 'Procurement protection', 'sld.e.h': 'Your waste contractor’s gate receipts will not stop a GPCB audit.', 'sld.e.sub': 'If your factory routes wet organic streams off-site, you must hold official, ULB-validated Extended Bulk Waste Generator Responsibility (EBWGR) certificates. Paper promises won’t survive cross-verification against commercial GST records.', 'sld.e.cta': 'Secure Valid EBWGR Records',
    // homepage sections
    'sec.threshold.any': 'Any entity with', 'sec.threshold.area': 'Building Area', 'sec.threshold.water': 'Water Consumption', 'sec.threshold.waste': 'Waste Generation', 'sec.threshold.tag': 'Cross any one threshold and you are a Bulk Waste Generator — registration under SWM Rules 2026 is mandatory.',
    'sec.new.h': 'What changed under SWM Rules 2026', 'sec.new.lead': 'The biggest waste-governance reform in a decade — replacing the SWM Rules 2016. Here’s what every Bulk Waste Generator must know.',
    'sec.seg.label': 'Rule 4 · Schedule I', 'sec.seg.h': 'Four-way segregation is mandatory', 'sec.seg.lead': 'From 1 April 2026, every home, office, hotel, hospital and factory must separate waste into four colour-coded streams. We make sure your filing reflects it.',
    'sec.seg.wet': 'Wet Waste', 'sec.seg.dry': 'Dry Waste', 'sec.seg.san': 'Sanitary', 'sec.seg.spc': 'Special Care',
    'sec.svc.label': 'Our Services', 'sec.svc.h': 'Choose your compliance pathway',
    'sec.how.label': 'Process', 'sec.how.h': 'Four steps to full compliance', 'sec.how.lead': 'From eligibility check to government portal acknowledgement — completely automated.',
    'sec.dead.h': 'The clock is already running', 'sec.dead.lead': 'SWM 2026 created legal obligations — not aspirations. Don’t wait for an audit notice.',
    'sec.why.label': 'Why Indian Waste Portal', 'sec.why.h': 'Trustworthy by design',
  },
  hi: {
    'wizard.badge': '60-सेकंड BWG स्व-जाँच',
    'wizard.title': 'पक्का नहीं कि नियम आप पर लागू होते हैं? तीन आँकड़े भरें।',
    'wizard.sub': 'इनमें से कोई एक सीमा पूरी होने पर आपकी सुविधा बल्क वेस्ट जनरेटर बन जाती है। कोई साइन-अप नहीं — तुरंत परिणाम।',
    'wizard.area': 'निर्मित क्षेत्र',
    'wizard.water': 'पानी का उपयोग',
    'wizard.waste': 'दैनिक कचरा',
    'wizard.bwgIf': 'BWG यदि ≥',
    'wizard.check': 'मेरी सुविधा जाँचें',
    'wizard.qualTitle': 'आपकी सुविधा बल्क वेस्ट जनरेटर के रूप में योग्य है।',
    'wizard.qualBody': 'CPCB SWM पोर्टल पर पंजीकरण अनिवार्य है। आपने पूरा किया: {x}. हमारे सलाहकार इसे पूरी तरह दाखिल कर सकते हैं।',
    'wizard.belowTitle': 'आप फ़िलहाल BWG सीमा से नीचे हो सकते हैं।',
    'wizard.belowBody': 'आपकी सुविधा बढ़ते ही सीमाएँ लागू होंगी — और स्वैच्छिक पंजीकरण आपको ऑडिट के लिए तैयार रखता है। पक्का करने के लिए हमसे बात करें।',
    'wizard.startReg': 'पंजीकरण शुरू करें',
    'wizard.registerVol': 'स्वेच्छा से पंजीकरण करें',
    'wizard.talk': 'सलाहकार से बात करें',
    'wizard.disclaimer': 'केवल सांकेतिक स्व-जाँच — कानूनी निर्णय नहीं। अंतिम पात्रता परामर्श के दौरान तय होती है।',
    'nav.services': 'सेवाएँ', 'nav.how': 'यह कैसे काम करता है', 'nav.pricing': 'मूल्य', 'nav.register': 'अभी पंजीकरण करें',
    'hero.inforce': 'लागू',
    'hero.h1pre': 'SWM 2026 की समयसीमा से पहले। अपनी सभी अपशिष्ट धाराएँ दर्ज करें', 'hero.h1hi': 'आज ही',
    'hero.sub': 'अनिवार्य स्रोत पृथक्करण लागू हो चुका है। देरी का जोखिम न लें। हम पोर्टल पर आपकी चारों अपशिष्ट धाराओं का पंजीकरण और फाइलिंग करते हैं, और 1 अप्रैल तक आपका व्यवसाय तैयार कर देते हैं।',
    'hero.countPre': 'सिर्फ़', 'hero.countLabel': 'दिन शेष — अनिवार्य SWM 2026 अनुपालन (1 अप्रैल 2026)',
    'hero.inforceAlert': 'SWM नियम 2026 लागू हो चुके हैं — बिना पंजीकरण वाले बल्क वेस्ट जनरेटर पर दंड का जोखिम है। आज ही पंजीकरण करें।',
    'hero.ctaUrgency': 'निरीक्षण नोटिस का इंतज़ार न करें — अधिकांश फाइलिंग 24 घंटे में पूरी हो जाती हैं।',
    'hero.cta1': 'अपना पंजीकरण शुरू करें', 'hero.cta2': 'सलाहकार से बात करें',
    'hero.trust1': 'राजपत्र पर आधारित', 'hero.trust2': 'OTP आपके पास रहता है', 'hero.trust3': 'LGD सत्यापित',
    'hero.mandatory': '1 अप्रैल 2026 से अनिवार्य', 'hero.fourway': 'चार-तरफ़ा स्रोत पृथक्करण', 'hero.ack': 'ACK जारी',
    'bin.wet': 'गीला', 'bin.dry': 'सूखा', 'bin.sanitary': 'स्वच्छता', 'bin.special': 'विशेष',
    'footer.tagline': 'CPCB/GPCB SWM 2026 अनुपालन मिडलवेयर।', 'footer.notaffil': 'किसी सरकारी निकाय से संबद्ध नहीं।',
    'footer.privacy': 'गोपनीयता नीति', 'footer.terms': 'सेवा की शर्तें', 'footer.refund': 'रिफंड नीति', 'footer.contact': 'संपर्क', 'footer.track': 'फाइलिंग ट्रैक करें',
    // hero slider
    'sld.d.badge': 'वार्षिक फाइलिंग समय-सीमा · 30 जून', 'sld.d.h': '30 जून की SWM वार्षिक रिटर्न समय-सीमा नज़दीक है। क्या आपकी फाइलिंग दर्ज है?', 'sld.d.sub': 'बल्क वेस्ट जनरेटर को हर साल 30 जून तक CPCB/ULB के पास वार्षिक रिटर्न दाखिल करना होता है। देरी या चूक आपकी इकाई को गैर-अनुपालन समीक्षा में डाल सकती है। अपनी फाइलिंग जल्दी दर्ज कराएँ।', 'sld.d.cta': 'अभी मेरी फाइलिंग शुरू करें', 'sld.d.days': 'अगली समय-सीमा तक दिन',
    'sld.f.badge': 'क्या आप बल्क वेस्ट जनरेटर हैं?', 'sld.f.h': '20,000 वर्ग मीटर निर्मित? 40,000 लीटर पानी रोज़? 100 किग्रा कचरा?', 'sld.f.sub': 'इनमें से कोई एक भी मानदंड पूरा करने पर नियम 6 के तहत आपकी सुविधा कानूनी रूप से बल्क वेस्ट जनरेटर बन जाती है। 4-स्ट्रीम पृथक्करण और रीयल-टाइम डिजिटल रिपोर्टिंग अब वैधानिक अनिवार्यता है।', 'sld.f.cta': '60-सेकंड पात्रता जाँच चलाएँ',
    'sld.l.badge': 'कानूनी प्रवर्तन', 'sld.l.h': 'गैर-अनुपालन आपके पानी और बिजली कनेक्शन को जोखिम में डाल सकता है।', 'sld.l.sub': 'अदालतों और स्थानीय निकायों ने लगातार SWM उल्लंघनकर्ताओं के विरुद्ध सख्त कार्रवाई को बरकरार रखा है — जिसमें सीलिंग नोटिस और गैर-अनुपालक वाणिज्यिक परिसरों के लिए उपयोगिता कटौती शामिल है। निरीक्षण से पहले पूर्ण अनुपालन में आएँ।', 'sld.l.cta': 'अपने परिसर के संचालन की रक्षा करें',
    'sld.s.badge': 'स्रोत पृथक्करण', 'sld.s.h': '2-बिन प्रणाली समाप्त। अब अनिवार्य 4-स्ट्रीम ऑडिटिंग।', 'sld.s.sub': 'औद्योगिक वॉशरूम कचरा, कैंटीन भोजन कचरा या समय-सीमा बीत चुकी दवाओं को मिलाने पर सीधे पर्यावरण जुर्माना लगता है। Indian Waste Portal डिजिटल लेजर आपके पूरे स्रोत-से-निपटान ट्रेल को सरल बनाते हैं।', 'sld.s.cta': 'स्वचालित SWM वर्कफ़्लो देखें',
    'sld.e.badge': 'खरीद सुरक्षा', 'sld.e.h': 'आपके कचरा ठेकेदार की गेट रसीदें GPCB ऑडिट को नहीं रोकेंगी।', 'sld.e.sub': 'यदि आपका कारखाना गीले जैविक कचरे को बाहर भेजता है, तो आपके पास आधिकारिक, ULB-सत्यापित EBWGR प्रमाणपत्र होने चाहिए। कागज़ी वादे वाणिज्यिक GST रिकॉर्ड के मिलान में नहीं टिकेंगे।', 'sld.e.cta': 'वैध EBWGR रिकॉर्ड सुरक्षित करें',
    // homepage sections
    'sec.threshold.any': 'कोई भी इकाई जिसमें', 'sec.threshold.area': 'भवन क्षेत्र', 'sec.threshold.water': 'पानी की खपत', 'sec.threshold.waste': 'कचरा उत्पादन', 'sec.threshold.tag': 'कोई एक भी सीमा पार करते ही आप बल्क वेस्ट जनरेटर हैं — SWM नियम 2026 के तहत पंजीकरण अनिवार्य है।',
    'sec.new.h': 'SWM नियम 2026 के तहत क्या बदला', 'sec.new.lead': 'एक दशक का सबसे बड़ा कचरा-प्रबंधन सुधार — SWM नियम 2016 की जगह। हर बल्क वेस्ट जनरेटर को यह जानना ज़रूरी है।',
    'sec.seg.label': 'नियम 4 · अनुसूची I', 'sec.seg.h': 'चार-तरफ़ा पृथक्करण अनिवार्य है', 'sec.seg.lead': '1 अप्रैल 2026 से हर घर, कार्यालय, होटल, अस्पताल और कारखाने को कचरे को चार रंग-कोडित स्ट्रीम में अलग करना होगा। हम सुनिश्चित करते हैं कि आपकी फाइलिंग इसे दर्शाए।',
    'sec.seg.wet': 'गीला कचरा', 'sec.seg.dry': 'सूखा कचरा', 'sec.seg.san': 'स्वच्छता', 'sec.seg.spc': 'विशेष देखभाल',
    'sec.svc.label': 'हमारी सेवाएँ', 'sec.svc.h': 'अपना अनुपालन मार्ग चुनें',
    'sec.how.label': 'प्रक्रिया', 'sec.how.h': 'पूर्ण अनुपालन के लिए चार चरण', 'sec.how.lead': 'पात्रता जाँच से लेकर सरकारी पोर्टल पावती तक — पूरी तरह स्वचालित।',
    'sec.dead.h': 'घड़ी पहले से चल रही है', 'sec.dead.lead': 'SWM 2026 ने कानूनी दायित्व बनाए हैं — आकांक्षाएँ नहीं। ऑडिट नोटिस का इंतज़ार न करें।',
    'sec.why.label': 'Indian Waste Portal क्यों', 'sec.why.h': 'डिज़ाइन से भरोसेमंद',
  },
  gu: {
    'wizard.badge': '60-સેકન્ડ BWG સ્વ-તપાસ',
    'wizard.title': 'ખાતરી નથી કે નિયમો તમને લાગુ પડે છે? ત્રણ આંકડા ભરો.',
    'wizard.sub': 'આમાંથી કોઈ એક મર્યાદા પૂરી થાય તો તમારી સુવિધા બલ્ક વેસ્ટ જનરેટર બને છે. કોઈ સાઇન-અપ નહીં — તરત પરિણામ.',
    'wizard.area': 'બાંધકામ વિસ્તાર',
    'wizard.water': 'પાણીનો વપરાશ',
    'wizard.waste': 'દૈનિક કચરો',
    'wizard.bwgIf': 'BWG જો ≥',
    'wizard.check': 'મારી સુવિધા તપાસો',
    'wizard.qualTitle': 'તમારી સુવિધા બલ્ક વેસ્ટ જનરેટર તરીકે લાયક છે.',
    'wizard.qualBody': 'CPCB SWM પોર્ટલ પર નોંધણી ફરજિયાત છે. તમે પૂરું કર્યું: {x}. અમારા સલાહકારો તે સંપૂર્ણ ફાઇલ કરી શકે છે.',
    'wizard.belowTitle': 'તમે હાલમાં BWG મર્યાદાથી નીચે હોઈ શકો છો.',
    'wizard.belowBody': 'તમારી સુવિધા વધતાં જ મર્યાદાઓ લાગુ થશે — અને સ્વૈચ્છિક નોંધણી તમને ઓડિટ માટે તૈયાર રાખે છે. ખાતરી માટે અમારો સંપર્ક કરો.',
    'wizard.startReg': 'નોંધણી શરૂ કરો',
    'wizard.registerVol': 'સ્વૈચ્છિક નોંધણી કરો',
    'wizard.talk': 'સલાહકાર સાથે વાત કરો',
    'wizard.disclaimer': 'માત્ર સૂચક સ્વ-તપાસ — કાનૂની નિર્ણય નથી. અંતિમ પાત્રતા પરામર્શ દરમિયાન નક્કી થાય છે.',
    'nav.services': 'સેવાઓ', 'nav.how': 'તે કેવી રીતે કામ કરે છે', 'nav.pricing': 'કિંમત', 'nav.register': 'હમણાં નોંધણી કરો',
    'hero.inforce': 'અમલમાં',
    'hero.h1pre': 'SWM 2026 ની સમયમર્યાદા પહેલાં. તમારી બધી કચરાની ધારાઓ નોંધાવો', 'hero.h1hi': 'આજે જ',
    'hero.sub': 'ફરજિયાત સ્રોત વિભાજન અમલમાં આવી ગયું છે. વિલંબનું જોખમ ન લો. અમે પોર્ટલ પર તમારી ચારેય કચરાની ધારાઓની નોંધણી અને ફાઇલિંગ કરીએ છીએ, અને 1 એપ્રિલ સુધીમાં તમારો વ્યવસાય તૈયાર કરીએ છીએ.',
    'hero.countPre': 'ફક્ત', 'hero.countLabel': 'દિવસ બાકી — ફરજિયાત SWM 2026 અનુપાલન (1 એપ્રિલ 2026)',
    'hero.inforceAlert': 'SWM નિયમો 2026 અમલમાં આવી ગયા છે — નોંધણી વગરના બલ્ક વેસ્ટ જનરેટર પર દંડનું જોખમ છે. આજે જ નોંધણી કરો.',
    'hero.ctaUrgency': 'નિરીક્ષણ નોટિસની રાહ ન જુઓ — મોટાભાગની ફાઇલિંગ 24 કલાકમાં પૂર્ણ થાય છે.',
    'hero.cta1': 'તમારી નોંધણી શરૂ કરો', 'hero.cta2': 'સલાહકાર સાથે વાત કરો',
    'hero.trust1': 'ગેઝેટ પર આધારિત', 'hero.trust2': 'OTP તમારી પાસે રહે છે', 'hero.trust3': 'LGD ચકાસાયેલ',
    'hero.mandatory': '1 એપ્રિલ 2026 થી ફરજિયાત', 'hero.fourway': 'ચાર-માર્ગી સ્રોત વિભાજન', 'hero.ack': 'ACK જારી',
    'bin.wet': 'ભીનો', 'bin.dry': 'સૂકો', 'bin.sanitary': 'સેનિટરી', 'bin.special': 'વિશેષ',
    'footer.tagline': 'CPCB/GPCB SWM 2026 અનુપાલન મિડલવેર.', 'footer.notaffil': 'કોઈ સરકારી સંસ્થા સાથે સંલગ્ન નથી.',
    'footer.privacy': 'ગોપનીયતા નીતિ', 'footer.terms': 'સેવાની શરતો', 'footer.refund': 'રિફંડ નીતિ', 'footer.contact': 'સંપર્ક', 'footer.track': 'ફાઇલિંગ ટ્રૅક કરો',
    // hero slider
    'sld.d.badge': 'વાર્ષિક ફાઇલિંગ સમયમર્યાદા · 30 જૂન', 'sld.d.h': '30 જૂનની SWM વાર્ષિક રિટર્ન સમયમર્યાદા નજીક છે. શું તમારી ફાઇલિંગ નોંધાયેલ છે?', 'sld.d.sub': 'બલ્ક વેસ્ટ જનરેટરે દર વર્ષે 30 જૂન સુધીમાં CPCB/ULB પાસે વાર્ષિક રિટર્ન ફાઇલ કરવું પડે છે. વિલંબ કે ચૂક તમારી સંસ્થાને બિન-અનુપાલન સમીક્ષામાં મૂકી શકે છે. તમારી ફાઇલિંગ વહેલી નોંધાવો.', 'sld.d.cta': 'હમણાં મારી ફાઇલિંગ શરૂ કરો', 'sld.d.days': 'આગલી સમયમર્યાદા સુધી દિવસો',
    'sld.f.badge': 'શું તમે બલ્ક વેસ્ટ જનરેટર છો?', 'sld.f.h': '20,000 ચો.મી બાંધકામ? 40,000 લિટર પાણી રોજ? 100 કિગ્રા કચરો?', 'sld.f.sub': 'આમાંથી કોઈ એક પણ માપદંડ પૂરો કરવાથી નિયમ 6 હેઠળ તમારી સુવિધા કાયદેસર રીતે બલ્ક વેસ્ટ જનરેટર બને છે. 4-સ્ટ્રીમ વિભાજન અને રીઅલ-ટાઇમ ડિજિટલ રિપોર્ટિંગ હવે વૈધાનિક ફરજિયાત છે.', 'sld.f.cta': '60-સેકન્ડ પાત્રતા તપાસ ચલાવો',
    'sld.l.badge': 'કાનૂની અમલ', 'sld.l.h': 'બિન-અનુપાલન તમારા પાણી અને વીજ જોડાણોને જોખમમાં મૂકી શકે છે.', 'sld.l.sub': 'અદાલતો અને સ્થાનિક સંસ્થાઓએ સતત SWM ઉલ્લંઘનકર્તાઓ સામે કડક પગલાં જાળવ્યાં છે — જેમાં સીલિંગ નોટિસ અને બિન-અનુપાલક વાણિજ્યિક સંકુલો માટે ઉપયોગિતા કપાત સામેલ છે. નિરીક્ષણ પહેલાં સંપૂર્ણ અનુપાલનમાં આવો.', 'sld.l.cta': 'તમારી સુવિધાના સંચાલનનું રક્ષણ કરો',
    'sld.s.badge': 'સ્રોત વિભાજન', 'sld.s.h': '2-બિન સિસ્ટમ સમાપ્ત. હવે ફરજિયાત 4-સ્ટ્રીમ ઓડિટિંગ.', 'sld.s.sub': 'ઔદ્યોગિક વોશરૂમ કચરો, કેન્ટીન ખોરાક કચરો કે સમયમર્યાદા વીતી ગયેલી દવાઓ ભેળવવાથી સીધો પર્યાવરણ દંડ લાગે છે. Indian Waste Portal ડિજિટલ લેજર તમારા સંપૂર્ણ સ્રોત-થી-નિકાલ ટ્રેલને સરળ બનાવે છે.', 'sld.s.cta': 'સ્વયંસંચાલિત SWM વર્કફ્લો જુઓ',
    'sld.e.badge': 'ખરીદી સુરક્ષા', 'sld.e.h': 'તમારા કચરા કોન્ટ્રાક્ટરની ગેટ રસીદો GPCB ઓડિટ રોકશે નહીં.', 'sld.e.sub': 'જો તમારું કારખાનું ભીના જૈવિક કચરાને બહાર મોકલે છે, તો તમારી પાસે અધિકૃત, ULB-ચકાસાયેલ EBWGR પ્રમાણપત્રો હોવા જોઈએ. કાગળના વચનો વાણિજ્યિક GST રેકોર્ડ સામે ટકશે નહીં.', 'sld.e.cta': 'માન્ય EBWGR રેકોર્ડ સુરક્ષિત કરો',
    // homepage sections
    'sec.threshold.any': 'કોઈપણ સંસ્થા જેમાં', 'sec.threshold.area': 'મકાન વિસ્તાર', 'sec.threshold.water': 'પાણીનો વપરાશ', 'sec.threshold.waste': 'કચરો ઉત્પાદન', 'sec.threshold.tag': 'કોઈ એક પણ મર્યાદા ઓળંગતાં જ તમે બલ્ક વેસ્ટ જનરેટર છો — SWM નિયમો 2026 હેઠળ નોંધણી ફરજિયાત છે.',
    'sec.new.h': 'SWM નિયમો 2026 હેઠળ શું બદલાયું', 'sec.new.lead': 'એક દાયકાનો સૌથી મોટો કચરા-શાસન સુધારો — SWM નિયમો 2016ની જગ્યાએ. દરેક બલ્ક વેસ્ટ જનરેટરે આ જાણવું જરૂરી છે.',
    'sec.seg.label': 'નિયમ 4 · અનુસૂચિ I', 'sec.seg.h': 'ચાર-માર્ગી વિભાજન ફરજિયાત છે', 'sec.seg.lead': '1 એપ્રિલ 2026થી દરેક ઘર, ઓફિસ, હોટેલ, હોસ્પિટલ અને કારખાનાએ કચરાને ચાર રંગ-કોડેડ સ્ટ્રીમમાં અલગ કરવો પડશે. અમે ખાતરી કરીએ છીએ કે તમારી ફાઇલિંગ તે દર્શાવે.',
    'sec.seg.wet': 'ભીનો કચરો', 'sec.seg.dry': 'સૂકો કચરો', 'sec.seg.san': 'સેનિટરી', 'sec.seg.spc': 'વિશેષ કાળજી',
    'sec.svc.label': 'અમારી સેવાઓ', 'sec.svc.h': 'તમારો અનુપાલન માર્ગ પસંદ કરો',
    'sec.how.label': 'પ્રક્રિયા', 'sec.how.h': 'સંપૂર્ણ અનુપાલન માટે ચાર પગલાં', 'sec.how.lead': 'પાત્રતા તપાસથી લઈને સરકારી પોર્ટલ સ્વીકૃતિ સુધી — સંપૂર્ણ સ્વયંસંચાલિત.',
    'sec.dead.h': 'ઘડિયાળ પહેલેથી ચાલી રહી છે', 'sec.dead.lead': 'SWM 2026એ કાનૂની જવાબદારીઓ બનાવી છે — આકાંક્ષાઓ નહીં. ઓડિટ નોટિસની રાહ ન જુઓ.',
    'sec.why.label': 'Indian Waste Portal શા માટે', 'sec.why.h': 'ડિઝાઇનથી વિશ્વસનીય',
  },
};

const Ctx = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en');
  useEffect(() => {
    try { const s = localStorage.getItem('iwp_lang'); if (s && DICT[s]) setLangState(s); } catch {}
  }, []);
  const setLang = (l) => { setLangState(l); try { localStorage.setItem('iwp_lang', l); } catch {} };
  const t = (key, vars) => {
    let s = (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;
    if (vars) for (const k of Object.keys(vars)) s = s.replace(`{${k}}`, vars[k]);
    return s;
  };
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);

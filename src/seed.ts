import { db } from "./db";

console.log("Resetting database...");

db.run("DELETE FROM reports;");
db.run("DELETE FROM sqlite_sequence WHERE name = 'reports';");
console.log("Reports cleared.");

db.run("DELETE FROM agents;");
db.run("DELETE FROM sqlite_sequence WHERE name = 'agents';");
console.log("Agents cleared.");

const agents = [
  {
    name: "Ahmad Rashwan",
    email: "ahmad.rashwan@vocalize-telecom.com",
    specialization_en: "Mobile Network, Coverage & Roaming: Mobile data issues, weak coverage, roaming activation, international calls, 4G/5G settings.",
    specialization_ar: "تغطية الشبكة والتجوال: مشاكل بيانات الهاتف، التغطية الضعيفة، تفعيل التجوال، المكالمات الدولية، إعدادات 4G/5G.",
    topics: ["network", "coverage", "signal", "roaming", "international", "sim", "data", "4g", "5g", "calling", "شبكة", "تغطية", "إشارة", "تجوال", "دولي", "شريحة", "داتا", "مكالمات", "ارسال", "مكالمة"]
  },
  {
    name: "Mariam El-Sawy",
    email: "mariam.elsawy@vocalize-telecom.com",
    specialization_en: "Recharge, Bills & Bundles: Postpaid bills, card recharging, package renewal, megabytes quota, balance transfers, credit disputes.",
    specialization_ar: "الشحن، الفواتير والباقات: فواتير الخطوط، شحن الكروت، تجديد الباقات، استهلاك الميجا بايت، تحويل الرصيد، شكاوى الرصيد والخصومات.",
    topics: ["recharge", "bill", "bundle", "package", "renewal", "balance", "credit", "megabytes", "flex", "rate", "شحن", "رصيد", "فاتورة", "باقة", "تجديد", "تحويل", "ميجا", "فليكس", "خصم", "فلوس"]
  },
  {
    name: "Mostafa Amin",
    email: "mostafa.amin@vocalize-telecom.com",
    specialization_en: "Mobile Cash & Digital Wallet: Setup, transfers, cash deposits/withdrawals, wallet PIN resets, merchant payments, cash-out issues.",
    specialization_ar: "محفظة الكاش الإلكترونية: تشغيل المحفظة، تحويل الأموال، السحب والإيداع، تغيير الرقم السري، الدفع للمتاجر، مشاكل سحب الكاش.",
    topics: ["cash", "wallet", "transfer", "deposit", "withdraw", "pin", "merchant", "wallet pin", "كاش", "محفظة", "تحويل فلوس", "سحب", "إيداع", "رقم سري", "إرسال أموال", "تحويل كاش"]
  },
  {
    name: "Nouran Selim",
    email: "nouran.selim@vocalize-telecom.com",
    specialization_en: "Home DSL & Fiber Internet: Landline speed configuration, home router setup, fiber cables activation, Wi-Fi troubleshooting.",
    specialization_ar: "الإنترنت المنزلي DSL والفيبر: سرعة النت الأرضي، إعدادات الراوتر، تفعيل كابل الفيبر، أعطال الواي فاي وتوصيل الأجهزة.",
    topics: ["dsl", "fiber", "router", "wifi", "landline", "speed", "internet", "modem", "connection", "نت أرضي", "راوتر", "واي فاي", "سرعة النت", "خط أرضي", "دي اس ال", "حرارة الخط", "راوتر منزلي"]
  },
  {
    name: "Sherif Fahmy",
    email: "sherif.fahmy@vocalize-telecom.com",
    specialization_en: "Enterprise & Corporate Solutions: Corporate lines management, dedicated business VPN, bulk messaging, enterprise account billing.",
    specialization_ar: "حلول الشركات والمؤسسات: إدارة خطوط الموظفين، الشبكات الخاصة VPN، الرسائل الجماعية SMS، فواتير حسابات الشركات الكبرى.",
    topics: ["enterprise", "corporate", "business", "vpn", "bulk sms", "contract", "company", "شركات", "مؤسسة", "أعمال", "حساب شركات", "عقد", "خط بيزنس", "رسائل جماعية"]
  },
  {
    name: "Hoda Abdelrahman",
    email: "hoda.abdelrahman@vocalize-telecom.com",
    specialization_en: "SIM Services & Device Shop: Lost SIM replacement, eSIM activation, device warranty, branch pickup schedules, phone sales.",
    specialization_ar: "خدمات الشريحة ومتجر الأجهزة: بدل فاقد/تالف للخطوط، شريحة eSIM، ضمان الهواتف، مواعيد الفروع والاستلام، بيع الهواتف.",
    topics: ["sim", "esim", "replacement", "lost", "device", "phone", "warranty", "store", "pickup", "شريحة", "شريحة إلكترونية", "بدل فاقد", "موبايل", "تلفون", "ضمان", "فرع", "شراء جهاز"]
  },
  {
    name: "Rania Youssef",
    email: "rania.youssef@vocalize-telecom.com",
    specialization_en: "Loyalty Points & Value Added Services: Loyalty program (Red/Points), caller tunes subscription, value-added services activation/cancellation.",
    specialization_ar: "نقاط الولاء والخدمات الترفيهية: برنامج النقاط والهدايا، الاشتراك وإلغاء الكول تون، الخدمات الترفيهية والقيمة المضافة.",
    topics: ["loyalty", "points", "caller tune", "vas", "promo", "gift", "entertainment", "tune", "نقاط", "كول تون", "خدمات ترفيهية", "إلغاء خدمة", "هدايا", "بروموكود", "نغمة"]
  }
];

const stmt = db.prepare(`
  INSERT INTO agents (name, email, specialization_en, specialization_ar, topics)
  VALUES ($name, $email, $specialization_en, $specialization_ar, $topics)
`);

for (const agent of agents) {
  stmt.run({
    $name: agent.name,
    $email: agent.email,
    $specialization_en: agent.specialization_en,
    $specialization_ar: agent.specialization_ar,
    $topics: JSON.stringify(agent.topics)
  });
  console.log(`Seeded agent: ${agent.name}`);
}

console.log("Database reset and seeding completed successfully.");

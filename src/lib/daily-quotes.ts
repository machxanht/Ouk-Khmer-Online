import type { Lang } from "./i18n";

export interface DailyQuote {
  quote: string;
  author?: string;
}

export const DAILY_QUOTES: Record<Lang, DailyQuote[]> = {
  vi: [
    {
      quote:
        "Tiến binh Trey cùng nhau — một con cá đơn độc không bao giờ vượt qua biển Hồ Tonle Sap.",
      author: "Châm ngôn Cờ Ouk Angkor",
    },
    {
      quote: "Sức mạnh của Neang nằm ở sự nhẫn nại, không phải ở những bước nhảy vội vã.",
      author: "Trí tuệ Cờ Hoàng Gia",
    },
    {
      quote: "Koul như voi chiến trong rừng già: chậm rãi vững chãi, khép góc không kẽ hở.",
      author: "Binh pháp Khmer",
    },
    {
      quote: "Ses dũng mãnh vì đường đi hiểm hóc, đừng để vó ngựa lạc lối giữa bàn cờ.",
      author: "Binh thư Angkor",
    },
    {
      quote: "Thuyền Tuuk làm chủ dòng sông mở, giữ vững hành lang là giữ vững giang sơn.",
      author: "Cổ ngữ Cờ Ouk",
    },
    {
      quote:
        "Người kỳ thủ chân chính không nhìn nước đi trước mắt, mà lắng nghe nhịp thở của cả ván cờ.",
      author: "Kỳ đạo Angkor",
    },
    {
      quote:
        "Mỗi nước cờ là một lời thề danh dự, thà thua trong tôn nghiêm hơn thắng nhờ gian dối.",
      author: "Luật Danh Dự Viel",
    },
    {
      quote: "Đừng vội chiếu Vua khi thế trận chưa định; nước Ouk vội vã là khởi đầu của thất bại.",
      author: "Binh pháp Ouk Chaktrang",
    },
    {
      quote: "Khi Vua cô độc giữa hoàng cung, đếm bước danh dự Mij là bài học về sự kiên cường.",
      author: "Trí tuệ Cờ Ouk",
    },
    {
      quote:
        "Nước đi đẹp nhất không phải là nước ăn quân nhiều nhất, mà là nước mang lại sự hài hòa cho toàn quân.",
      author: "Kỳ phái Bayon",
    },
    {
      quote: "Kiên nhẫn trên bàn cờ là chìa khóa mở cánh cổng đền đài chiến thắng.",
      author: "Châm ngôn Cổ truyền",
    },
    {
      quote:
        "Binh Trey biến thành Trey Bork, kẻ yếu thế qua muôn trùng thử thách sẽ thành anh hùng.",
      author: "Truyền thuyết Ouk",
    },
    {
      quote: "Chiến trường 64 ô là tấm gương phản chiếu lòng kiên định của người quân tử.",
      author: "Kỳ nhân Siem Reap",
    },
    {
      quote: "Không có ván cờ nào thua nếu bạn học được bài học từ mỗi nước đi sai lầm.",
      author: "Danh sư Cờ Ouk",
    },
    {
      quote: "Tâm tĩnh như mặt hồ Angkor Wat lúc bình minh, nước cờ ắt sẽ sáng tỏ.",
      author: "Thiền đạo Cờ Ouk",
    },
    {
      quote: "Kỵ binh Ses và Chiến xa Tuuk kết hợp như gió cuốn mây tan.",
      author: "Trận pháp Hoàng triều",
    },
    {
      quote:
        "Biết tiến biết thoái, biết nhường nước tiên để đoạt đại cục, đó là đạo của bậc đại sư.",
      author: "Kỳ phổ Cổ Angkor",
    },
    {
      quote:
        "Chiến thắng vĩ đại nhất không phải đánh bại đối thủ, mà là làm chủ tâm trí của chính mình.",
      author: "Triết lý Cờ Ouk",
    },
    {
      quote: "Hàng phòng ngự vững chắc hơn ngàn mũi giáo công phá.",
      author: "Binh pháp Angkor",
    },
    {
      quote: "Hãy tôn trọng từng quân cờ nhỏ bé; mất một Trey, giang sơn có thể lung lay.",
      author: "Lời dạy Tiền nhân",
    },
    {
      quote:
        "Trước khi xuất quân, hãy nhìn lại cung điện; an định hậu phương mới có thể viễn chinh.",
      author: "Kỳ đạo Hoàng gia",
    },
    {
      quote: "Chiếu Vua bằng trí tuệ, thắng trận bằng nhân tâm.",
      author: "Binh thư Cổ truyền",
    },
    {
      quote: "Tia nắng rọi qua đỉnh tháp Bayon soi đường cho nước cờ quyết định.",
      author: "Kỳ thi Angkor",
    },
    {
      quote: "Dũng cảm không phải lao lên mù quáng, mà là đứng vững khi giông bão vây quanh.",
      author: "Trí tuệ Cờ Ouk",
    },
    {
      quote: "Hai kỳ thủ ngồi đối diện là hai người bạn cùng khắc họa nên một kiệt tác thời gian.",
      author: "Kỳ hữu Angkor",
    },
    {
      quote:
        "Thời gian trên đồng hồ cờ trôi đi, nhưng vẻ đẹp của nước cờ hay còn mãi với ngàn năm.",
      author: "Kỳ nhân Campuchia",
    },
    {
      quote: "Dù một bước đi ngắn ngủi của Neang, nếu đúng thời điểm sẽ xoay chuyển càn khôn.",
      author: "Bí kíp Cờ Ouk",
    },
    {
      quote: "Lắng nghe tiếng gõ cờ vang vọng bên hiên chùa cổ — tĩnh tâm để thấu hiểu vạn vật.",
      author: "Châm ngôn Dân gian",
    },
    {
      quote:
        "Trận thế dù ngặt nghèo, đếm đủ 64 bước Viel K'dar cũng là một khúc hoành ca hòa hoãn.",
      author: "Luật Viel Cổ",
    },
    {
      quote: "Nụ cười của tượng thần Bayon nhắc nhở ta giữ bình thản trước mọi biến cố của ván cờ.",
      author: "Kỳ đạo Angkor",
    },
    {
      quote: "Bước vào bàn cờ với lòng khiêm cung, rời bàn cờ với tâm hồn thanh thản.",
      author: "Lời vàng Kỳ thủ",
    },
  ],
  km: [
    {
      quote: "ដើរត្រីទៅមុខជាមួយគ្នា — ត្រីមួយក្បាលមិនដែលឆ្លងទន្លេសាបតែម្នាក់ឯងឡើយ។",
      author: "សុភាសិតអុកបុរាណ",
    },
    {
      quote: "កម្លាំងរបស់នាងស្ថិតនៅលើការអត់ធ្មត់ មិនមែននៅលើការប្រញាប់ប្រញាល់នោះទេ។",
      author: "ប្រាជ្ញាអុកហ្លួង",
    },
    {
      quote: "គោលប្រៀបដូចដំរីចម្បាំងក្នុងព្រៃស្ងប់៖ យឺតតែរឹងមាំ បិទផ្លូវឥតចន្លោះ។",
      author: "ក្បួនយុទ្ធសាស្ត្រខ្មែរ",
    },
    {
      quote: "សេះមានឫទ្ធិព្រោះផ្លូវបត់បែន ចូរកុំឱ្យជើងសេះវង្វេងកណ្តាលក្តារអុក។",
      author: "ក្បួនទ័ពអង្គរ",
    },
    {
      quote: "ទូកគ្រប់គ្រងខ្សែទឹកបើកចំហ រក្សាផ្លូវទូកគឺរក្សាព្រះនគរ។",
      author: "ពាក្យបណ្តាំអុកចត្រង្គ",
    },
    {
      quote: "អ្នកលេងអុកដ៏ពិតប្រាកដ មិនសម្លឹងត្រឹមតែក្បាច់មួយជំហានទេ គឺស្តាប់ដង្ហើមនៃក្តារទាំងមូល។",
      author: "វិជ្ជាអុកអង្គរ",
    },
    {
      quote: "គ្រប់ក្បាច់អុកគឺជាពាក្យសច្ចៈ ចាញ់ដោយកិត្តិយសប្រសើរជាងឈ្នះដោយកលល្បិច។",
      author: "ច្បាប់កិត្តិយសវៀល",
    },
    {
      quote: "កុំប្រញាប់អុកស្តេចពេលសមរភូមិមិនទាន់រៀបរយ ការអុកដោយប្រញាប់គឺជាដើមចមនៃបរាជ័យ។",
      author: "ក្បួនអុកចត្រង្គ",
    },
    {
      quote: "ពេលស្តេចឯកោក្នុងរាជវាំង ការរាប់ជំហានកិត្តិយសគឺជាមេរៀននៃការតស៊ូ។",
      author: "ប្រាជ្ញាអុកបុរាណ",
    },
    {
      quote: "ក្បាច់ដើរដ៏ល្អបំផុត មិនមែនជាការស៊ីកូនច្រើនទេ គឺការបង្កើតតុល្យភាពនៃកងទ័ពទាំងមូល។",
      author: "ក្បួនអុកបាយ័ន",
    },
    {
      quote: "ការអត់ធ្មត់នៅលើក្តារអុក គឺជាកូនសោបើកទ្វារប្រាសាទនៃជ័យជម្នះ។",
      author: "សុភាសិតបុរាណ",
    },
    {
      quote: "ត្រីដើរដល់ត្រើយប្រែក្លាយជាត្រីបក មនុស្សទន់ខ្សោយឆ្លងកាត់ការសាកល្បងនឹងក្លាយជាវីរបុរស។",
      author: "រឿងព្រេងអុកខ្មែរ",
    },
    {
      quote: "សមរភូមិ ៦៤ ក្រឡា គឺជាកញ្ចក់ឆ្លុះបញ្ចាំងពីភាពរឹងមាំនៃចិត្តមនុស្ស។",
      author: "អ្នកប្រាជ្ញអុកសៀមរាប",
    },
    {
      quote: "គ្មានការប្រកួតណាដែលចាញ់ឡើយ ប្រសិនបើអ្នករៀនសូត្រពីកំហុសនៃជំហាននីមួយៗ។",
      author: "គ្រូអុកចត្រង្គ",
    },
    {
      quote: "ចិត្តស្ងប់ដូចផ្ទៃទឹកអង្គរវត្តពេលព្រឹកព្រលឹម ក្បាច់អុកនឹងភ្លឺថ្លា។",
      author: "ធម៌អុកអង្គរ",
    },
    {
      quote: "កងទ័ពសេះ និងកងទ័ពទូក រួមគ្នាដូចខ្យល់កួចបោសសម្អាតពពក។",
      author: "ក្បួនទ័ពហ្លួង",
    },
    {
      quote: "ចេះដកថយ ចេះវាយលុក ចេះលះបង់ជំហានមុខដើម្បីការឈ្នះធំ នោះជាមាគ៌ាកំពូលកីឡាករ។",
      author: "គម្ពីរអុកអង្គរ",
    },
    {
      quote: "ជ័យជម្នះដ៏អស្ចារ្យបំផុត មិនមែនយកឈ្នះគូប្រកួតទេ គឺយកឈ្នះចិត្តខ្លួនឯង។",
      author: "ទស្សនវិជ្ជាអុក",
    },
    {
      quote: "ការការពារដ៏រឹងមាំ ប្រសើរជាងលំពែងរាប់ពាន់ដែលវាយលុក។",
      author: "ក្បួនទ័ពខ្មែរ",
    },
    {
      quote: "ចូរផ្តល់តម្លៃដល់កូនត្រីតូចៗ បាត់បង់ត្រីមួយ នគរអាចរង្គោះរង្គើ។",
      author: "ពាក្យទូន្មានបុរាណ",
    },
  ],
  en: [
    {
      quote: "Advance the Trey together — a lone fish never crosses the great Tonle Sap.",
      author: "Angkor Ouk Proverb",
    },
    {
      quote: "The true power of the Neang lies in steadfast patience, not in hasty leaps.",
      author: "Royal Ouk Wisdom",
    },
    {
      quote:
        "The Koul moves like an elephant through the deep jungle: calm, heavy, and leaving no gaps.",
      author: "Khmer Strategic Lore",
    },
    {
      quote: "The Ses is formidable in its angular path; never let your steed lose its way.",
      author: "Angkor Cavalry Treatises",
    },
    {
      quote: "The Tuuk commands the open rivers; securing the corridors secures the kingdom.",
      author: "Ancient Ouk Lore",
    },
    {
      quote:
        "A true master does not merely calculate single moves, but listens to the rhythm of the entire board.",
      author: "Angkor Chess Way",
    },
    {
      quote:
        "Every move is a pledge of honor; better to lose with dignity than win through deceit.",
      author: "The Viel Honor Rule",
    },
    {
      quote:
        "Do not rush to check the King before the lines are drawn; a hasty Ouk invites defeat.",
      author: "Ouk Chaktrang Strategy",
    },
    {
      quote:
        "When the King stands alone in the palace, counting the honor steps teaches unyielding resilience.",
      author: "Ouk Philosophy",
    },
    {
      quote:
        "The finest move is not the one capturing the most pieces, but the one bringing harmony to all forces.",
      author: "Bayon Chess Order",
    },
    {
      quote: "Patience upon the board is the key that opens the temple gates of victory.",
      author: "Traditional Proverb",
    },
    {
      quote:
        "When a humble Trey reaches the enemy line to become Trey Bork, endurance transforms into triumph.",
      author: "Ouk Legend",
    },
    {
      quote:
        "The 64-square battlefield is a mirror reflecting the composure and honor of the soul.",
      author: "Siem Reap Masters",
    },
    {
      quote: "No match is truly lost if you extract wisdom from every misstep.",
      author: "Ancient Grandmasters",
    },
    {
      quote:
        "Keep your mind serene like the waters of Angkor Wat at dawn, and clarity shall guide your hand.",
      author: "Zen of Ouk",
    },
    {
      quote:
        "When the Ses cavalry and Tuuk boats synchronize, no barrier can withstand their tide.",
      author: "Royal Battle Scrolls",
    },
    {
      quote: "Knowing when to advance and when to hold back is the true mark of mastery.",
      author: "Angkor Chess Annals",
    },
    {
      quote:
        "The greatest victory is not vanquishing an opponent, but mastering one's own impulses.",
      author: "Ouk Philosophy",
    },
    {
      quote: "An impenetrable foundation is worth more than a thousand reckless spears.",
      author: "Angkor Strategy",
    },
    {
      quote: "Respect every small Trey pawn; losing one may cause an empire to tremble.",
      author: "Ancient Teachings",
    },
  ],
  fr: [
    {
      quote:
        "Avancez les pions Trey ensemble — un poisson solitaire ne traverse jamais le grand Tonlé Sap.",
      author: "Proverbe d'Angkor",
    },
    {
      quote: "La force de la Neang réside dans la patience, et non dans la précipitation.",
      author: "Sagesse Royale d'Ouk",
    },
    {
      quote:
        "Le Koul avance tel l'éléphant royal dans la jungle : calme, puissant et impénétrable.",
      author: "Stratégie Khmère",
    },
    {
      quote:
        "Le cavalier Ses est redoutable par sa trajectoire oblique ; ne laissez point son élan s'égarer.",
      author: "Traité de Cavalerie d'Angkor",
    },
    {
      quote:
        "Le bateau Tuuk règne sur les fleuves ouverts ; maîtriser les colonnes, c'est protéger le royaume.",
      author: "Maxime d'Ouk",
    },
    {
      quote:
        "Le véritable maître ne calcule pas seulement des coups, il écoute l'harmonie de l'échiquier.",
      author: "Voie d'Angkor",
    },
    {
      quote:
        "Chaque coup est un serment d'honneur ; mieux vaut perdre dignement que triompher sans gloire.",
      author: "Règle d'Honneur de Viel",
    },
    {
      quote:
        "Ne vous hâtez point de prononcer 'Ouk' avant que les défenses adverses ne soient brisées.",
      author: "Art Militaire d'Ouk",
    },
    {
      quote:
        "Même lorsque le Roi est encerclé, le décompte d'honneur Viel enseigne la noble résistance.",
      author: "Philosophie Khmère",
    },
    {
      quote:
        "Le coup le plus élégant n'est pas celui qui prend, mais celui qui accorde toutes les pièces.",
      author: "Ordre du Bayon",
    },
  ],
  th: [
    {
      quote: "เดินเบี้ยปลาพร้อมเพรียงกัน — ปลาตัวเดียวไม่อาจว่ายข้ามทะเลสาบเขมรได้โดยลำพัง",
      author: "สุภาษิตหมากรุกเขมร",
    },
    {
      quote: "พลังของนางอยู่ที่ความอดทน มิใช่การกระโดดที่วู่วาม",
      author: "ปัญญาหมากรุกหลวง",
    },
    {
      quote: "โคนเคลื่อนดั่งคชสารในไพรสงบ: เชื่องช้าแต่มั่นคง ปิดทุกช่องโหว่",
      author: "พิชัยสงครามนครวัด",
    },
    {
      quote: "ม้าศึกทรงพลังด้วยวิถีอันแยบคาย อย่าให้ฝีเท้าม้าหลงทางกลางกระดาน",
      author: "ตำราพิชัยยุทธ์",
    },
    {
      quote: "เรือคุมสายน้ำเปิดกว้าง ครองเส้นทางหลักคือครองแผ่นดิน",
      author: "คติหมากรุกโบราณ",
    },
    {
      quote: "ผู้เล่นที่แท้จริงมิได้มองเพียงตาเดินถัดไป แต่มองเห็นความสอดคล้องทั้งกระดาน",
      author: "วิถีหมากรุกนครวัด",
    },
    {
      quote: "ทุกการเดินคือคำสัตย์ ยอมแพ้อย่างมีเกียรติดีกว่าชนะด้วยเล่ห์กล",
      author: "กฎเกียรติยศเวียล",
    },
    {
      quote: "อย่าเพิ่งรีบรุกขุนเมื่อค่ายกลยังไม่พร้อม การรุกที่รีบร้อนคือบ่อเกิดแห่งความพ่ายแพ้",
      author: "กลยุทธ์อุกฉัตรัง",
    },
    {
      quote: "เมื่อขุนต้องอยู่อย่างโดดเดี่ยว การนับก้าวศักดิ์ศรีคือบทเรียนแห่งความทรหด",
      author: "ปรัชญาหมากรุก",
    },
    {
      quote: "จิตสงบดั่งผืนน้ำนครวัดยามรุ่งอรุณ ย่อมมองเห็นวิถีหมากรุกอันกระจ่างใส",
      author: "สมาธิหมากรุก",
    },
  ],
  zh: [
    {
      quote: "鱼兵齐进 — 独鱼难渡洞里萨湖千重浪。",
      author: "吴哥棋谚",
    },
    {
      quote: "后之威仪，在乎从容隐忍，不在躁进妄动。",
      author: "王室棋道",
    },
    {
      quote: "象如丛林战象，步履沉稳，封堵毫无间隙。",
      author: "高棉兵略",
    },
    {
      quote: "马踏斜径锋芒显，莫使战马迷失于中局。",
      author: "吴哥骑兵典册",
    },
    {
      quote: "舟行通衢通八面，控纵江河则江山固。",
      author: "古代高棉棋训",
    },
    {
      quote: "大弈者不惟算一着之得失，而在洞悉整盘棋势之呼吸。",
      author: "高棉棋道",
    },
    {
      quote: "落子如诺，尊严第一；宁守节而负，不弄巧而胜。",
      author: "尊严数步之训",
    },
    {
      quote: "阵势未合莫妄将军，仓促之'អុក(Ouk)'实为败因。",
      author: "高棉棋弈战法",
    },
    {
      quote: "王孤殿宇深，尊严数步尽显坚韧气节。",
      author: "古高棉棋弈哲学",
    },
    {
      quote: "心如清晨吴哥寺之静水，落子自然灵明清澈。",
      author: "高棉禅奕",
    },
  ],
};

/**
 * Returns a deterministic daily quote based on the current UTC date.
 * - Changes only at midnight.
 * - Same day -> identical quote on refresh/reload across renders and app opens.
 * - Full language support (vi, km, en, fr, th, zh) with guaranteed fallback.
 */
export function getDailyQuote(lang: Lang = "vi"): DailyQuote {
  const quotesList = DAILY_QUOTES[lang] || DAILY_QUOTES.vi;
  if (!quotesList || quotesList.length === 0) {
    return {
      quote:
        "Tiến binh Trey cùng nhau — một con cá đơn độc không bao giờ vượt qua biển Hồ Tonle Sap.",
      author: "Châm ngôn Cờ Ouk Angkor",
    };
  }

  // Calculate day count since Unix epoch in UTC
  const now = new Date();
  const dayIndex = Math.floor(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / (1000 * 60 * 60 * 24),
  );

  const quoteIndex = Math.abs(dayIndex) % quotesList.length;
  return quotesList[quoteIndex] || quotesList[0];
}

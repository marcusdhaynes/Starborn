import { useState, useEffect } from 'react';
import { safeStorage } from '../storage';

// Accurate, fluent, and contextual English to Arabic translation map
export const arDict: Record<string, string> = {
  // Section Headers
  "Starborn": "سليل النجم",
  "Compendium": "الموسوعة",
  "Journal": "اليوميات",
  "Inventory": "المخزون",
  "Weapons": "الأسلحة",
  "Magic": "السحر",
  "BODY": "الجسد",
  "MIND": "العقل",
  "SPEED": "السرعة",
  "ENDURE": "التحمل",
  "WIELD": "التحكم",
  "MAGIC": "السحر",
  "Tabletop": "طاولة اللعب",
  "Dice": "النرد",

  // Settings Header & Core Tabs
  "SETTINGS": "الإعدادات",
  "Settings": "الإعدادات",
  "Close": "إغلاق",
  "Google Login": "تسجيل الدخول بجوجل",
  "Visuals": "المرئيات",
  "Backend": "الخلفية",
  "Gameplay": "اللعب",

   // Tab: Visuals
  "Layout Orientation": "اتجاه التخطيط",
  "Vertical": "رأسي",
  "Horizontal": "أفقي",
  "Accent Color": "اللون المميز",
  "Pink": "وردي",
  "Cyan": "سماوي",
  "Gold": "ذهبي",
  "Green": "أخضر",
  "Purple": "بنفسجي",
  "Theme Mode": "نمط المظهر",
  "Dark": "داكن",
  "Light": "فاتح",
  "Glow Intensity": "شدة التوهج",
  "Dim": "خافت",
  "Normal": "طبيعي",
  "Intense": "شديد",
  "Theme": "المظهر",
  "Character": "تخطيط الشخصية",
  "Navigation": "التنقل",
  "Hover Text": "نص التمرير",
  "Stats": "الخصائص",
  "Dice Theme": "مظهر النرد",
  "D-Pad": "لوحة الاتجاهات",
  "Joystick": "عصا التحكم",
  "Off": "إيقاف",
  "On": "تشغيل",
  "Magma": "ماجما",
  "Cosmos": "الكون",
  "Water": "الماء",
  "Diamond": "الماس",
  "Emerald": "الزمرد",
  "Select Magma Theme": "تحديد مظهر ماجما",
  "Select Cosmos Theme": "تحديد مظهر الكون",
  "Select Water Theme": "تحديد مظهر الماء",
  "Select Diamond Theme": "تحديد مظهر الماس",
  "Select Emerald Theme": "تحديد مظهر الزمرد",
  "You have changed Compendium, Weapons or Items matrix arrays. Do you want to save changes to the database before closing?": "لقد قمت بتغيير مصفوفات الموسوعة أو الأسلحة أو العناصر. هل تريد حفظ التغييرات في قاعدة البيانات قبل الإغلاق؟",

  // Tab: Gameplay Setup
  "Grid Snapping Size": "حجم محاذاة الشبكة",
  "No Snap": "بدون محاذاة",
  "Dice Bounciness": "ارتداد النرد",
  "Sound Effects (SFX) Volume": "مستوى الصوت (SFX)",
  "Ambient Star Density": "كثافة النجوم المحيطة",
  "Low": "منخفضة",
  "Medium": "متوسطة",
  "High": "مرتفعة",
  "Metal Box Clicking Audio": "صوت نقر الصندوق المعدني",

  // Tab: Backend
  "Storage Mode (Sync)": "وضع التخزين (المزامنة)",
  "Persistent Storage": "تخزين مستمر",
  "Local-Only Session": "جلسة محلية فقط",
  "Database Sync Interval": "معدل مزامنة قاعدة البيانات",
  "seconds": "ثانية",
  "Max Debug Log Lines": "الحد الأقصى لسجلات التصحيح",
  "Danger Zone (Purge)": "منطقة الخطر (التطهير)",
  "Purge Database Cache": "تطهير ذاكرة التخزين المؤقت",
  "Purge Cache": "تطهير الذاكرة المؤقتة",
  "Clear Offline Memory": "مسح الذاكرة غير المتصلة بالإنترنت",
  "Confirm Purge?": "تأكيد التطهير؟",

  // Spell Matrix & Cast Sidebar (02_restructure)
  "Spell Build": "بناء التعويذة",
  "Level": "المستوى",
  "Source": "المصدر",
  "Targeting": "الاستهداف",
  "Hold & Duration": "الاحتجاز والمدة",
  "Energy": "الطاقة",
  "Restrictions": "القيود",
  "Description": "الوصف",
  "Free Cast": "إلقاء حر",
  "Cast Spell": "إلقاء التعويذة",
  "Insufficient Magic": "سحر غير كافٍ",
  "Insufficient": "غير كافٍ",
  "Scale": "المقياس",
  "Duration": "المدة",
  "Effect": "التأثير",
  "None Specified": "لم يحدد شيء",
  "None": "لا يوجد",
  "Effects": "التأثيرات",
  "Offensive": "هجومي",
  "Manipulative": "تلاعب",
  "Protective": "وقائي",
  "Virtus": "الفضائل",
  "Mortal": "فانون",
  "Metaphysical": "ما وراء الطبيعة",
  "Immortal": "خالدون",
  "Wizards": "السحرة",
  "Vampires": "مصاصو الدماء",
  "Werewolves": "المستذئبون",
  "Cursed": "الملعونون",
  "Fae": "مخلوقات الفاي",
  "Spirits": "الأرواح",
  "Reanimated": "المعاد إحياؤهم",
  "Divine": "الإلهيون",
  "Outsiders": "الغرباء",

  // Targeting metrics inside Cast matrix
  "Count": "العدد",
  "Origin": "المنشأ",
  "Range": "المدى",

  // App metrics
  "Life": "الحياة",
  "Max Life": "أقصى حياة",
  "Current Life": "الحياة الحالية",
  "Threat Meter": "مقياس التهديد",
  "Reset": "إعادة ضبط",
  "Roll": "دحرجة",

  // Confirmation Unsaved Modals
  "Unsaved Matrix Edits": "تعديلات غير محفوظة في المصفوفة",
  "Cancel": "إلغاء",
  "Discard Changes": "تجاهل التغييرات",
  "Save & Exit Window": "حفظ وخروج",

  // Ranges
  "Contact Range": "مدى التلامس",
  "Close Range": "مدى قريب",
  "Short Range": "مدى قصير",
  "Medium Range": "مدى متوسط",
  "Long Range": "مدى بعيد",
  "Extended Range": "مدى ممتد",
  "Ultra-Long Range": "مدى فائق البعد",
  "Beyond-Horizon Range": "أبعد من الأفق",
  "Deep Space Range": "الفضاء السحيق",

  // Durations & Scales
  "Centimeter": "سنتيمتر",
  "Decimeter": "ديسيمتر",
  "Meter": "متر",
  "Decameter": "ديكامتر",
  "Hectometer": "هكتومتر",
  "Kilometer": "كيلومتر",
  "Megameter": "ميغامتر",
  "Gigameter": "جيغامتر",
  "Terameter": "تيرامتر",
  "Petameter": "بيتامتر",
  "Exameter": "إكسامتر",
  "Zettameter": "زيتامتر",
  "Yottameter": "يوتامتر",
  "Ronnameter": "رونامتر",
  "Quettameter": "كويتامتر",

  "Action": "إجراء",
  "Round": "جولة",
  "Minute": "دقيقة",
  "Ten Minutes": "عشر دقائق",
  "Hour": "ساعة",
  "Four Hours": "أربع ساعات",
  "Day": "يوم",
  "Week": "أسبوع",
  "Month": "شهر",
  "Year": "سنة",
  "Decade": "عقد",
  "Century": "قرن",
  "Millennium": "ألفية",
  "Age": "عصر",
  "Epoch": "حقبة",

  // Spell Builder labels/hover text helper inputs
  "3-5. Targeting Vectors": "3-5. متجهات الاستهداف",
  "Target [Counts]": "الهدف [العدد]",
  "Target [Origin]": "الهدف [المنشأ]",
  "Target [Range]": "الهدف [المدى]",
  "1. Application": "1. التطبيق",
  "2. Effect": "2. التأثير",
  "6. Hold": "6. الاحتجاز",
  "7. Duration": "7. المدة",
  "8. Power": "8. القوة",
  "9. Restrictions": "9. القيود",
  "Mana Cost": "تكلفة المانا",
  "Earned Dice": "النرد المكتسب",
  "Save to Compendium": "حفظ في الموسوعة",
  "Points Spent": "النقاط المستهلكة",
  "Points Remaining": "النقاط المتبقية",
  "Spell Name": "اسم التعويذة",
  "Flavor Text": "النص الإيحائي",
  "Category": "الفئة",
  "Combat": "قتالي",
  "Auxiliary": "مساعد",
  "Transformative": "تحولي",
  "None Selected": "لم يحدد شيء",
  "Gothic Arena Actions": "إجراءات الحلبة القوطية",
  "Gameplay Config Locked": "تكوين أسلوب اللعب مغلق",
  "The celestial gears of fate have folded this node into void. Custom rules, combat trackers, and state cards shall materialize during future epochs.": "لقد طوت تروس القدر السماوية هذه العقدة إلى الفراغ. ستتجسد القواعد المخصصة ومتعقبات القتال وبطاقات الحالة خلال العصور القادمة.",
  "Save Changes": "حفظ التغييرات",
  "Syncing Matrix...": "موقع المزامنة للمصفوفة...",
  "Free": "حر",

  // New Tabletop Map translations & campaign defaults
  "Folder is empty": "المجلد فارغ",
  "Retrieve Map": "استرجاع الخريطة",
  "TABLETOP INTEL & BATTLEMAP VIEWPORT": "لوحة ذكاء طاولة اللعب وخريطة المعركة",
  "Active Grid": "الشبكة النشطة",
  "Campaign Map Index": "فهرس خرائط الحملة",
  "Create Subfolder": "إنشاء مجلد فرعي",
  "Add Custom Map": "إضافة خريطة مخصصة",
  "Collapse Sidebar": "طي الشريط الجانبي",
  "Expand Sidebar": "توسيع الشريط الجانبي",
  "No maps found. Select / drag maps to build campaign index.": "لم يتم العثور على خرائط. حدد / اسحب الخرائط لبناء فهرس الحملة.",
  "Add Battlemap Image": "إضافة صورة خريطة معركة",
  "Select / Drop Images Here": "حدد / أسقط الصور هنا",
  "NO MAPS ACTIVATED": "لم يتم تفعيل أي خريطة",
  "Select an existing battle campaign map from the directory tree sidebar, or import your own image to instantiate coordinates.": "حدد خريطة حملة معركة حالية من شريط دليل المجلدات، أو استورد صورتك لتفعيل الإحداثيات والشبكة.",
  "Wheel": "العجلة",
  "Drag": "السحب",
  "Scroll Map": "تحريك الخريطة",
  "Recenter Camera": "إعادة ضبط الكاميرات",
  "Recenter View": "إعادة ضبط الرؤية",
  "DESTROY MAP RECORD?": "تدمير سجل الخريطة؟",
  "Are you sure you want to delete": "هل أنت متأكد أنك تريد حذف الخريطة",
  "This will permanently de-link this map asset.": "سيؤدي هذا إلى إلغاء ربط أصل الخريطة بشكل دائم.",
  "Delete Mapping": "تأكيد الحذف",
  "Grid Config": "تكوين الشبكة",
  "AI": "ذكاء اصطناعي",
  "Size": "الحجم",
  "Opacity": "الشفافية",
  "X-Align": "المحاذاة الأفقية",
  "Y-Align": "المحاذاة الرأسية",
  "Analyzing Map...": "جاري تحليل الخريطة...",
  "AI Auto-Grid": "محاذاة تلقائية بالذكاء",

  // Defaults
  "Campaign: The Void": "الحملة: الفراغ",
  "Celestial Rift Grid": "شبكة الصدع السماوي",
  "Campaign: Darkstone Keep": "الحملة: قلعة الحجر الداكن",
  "Keep Inner Courtyard": "الفناء الداخلي للقلعة",
  "Whispering Forest Path": "مسار الغابة الهامسة",

  // HUD and Quick reset life stats
  "HP": "الحياة",
  "MAX": "الأقصى",
  "TEMP": "مؤقت",
  "FULL HP": "كامل الصحة",
  "FULL": "كامل",
  "BLOODIED": "مدمى",
  "Mini": "صغير",

  // Spell / Tabletop / Companions UI translations
  "Magic Details": "تفاصيل السحر",
  "Inventory Details": "تفاصيل المخزن",
  "Journal Details": "تفاصيل السجل",
  "Compendium Details": "تفاصيل الموسوعة",
  "Weapons Details": "تفاصيل الأسلحة",
  "Starborn Details": "تفاصيل وليد النجوم",
  "Spellbook Actions:": "إجراءات كتاب التعاويذ:",
  "Create Spell": "إنشاء تعويذة",
  "Spell Builder": "منشئ التعاويذ",
  "SCHOOL SUB-TYPES": "الأنواع الفرعية للمدرسة",
  "SELECT SPATIAL BOUNDS": "حدد الحدود المكانية",
  "SELECT TEMPORAL BOUNDS": "حدد الحدود الزمنية",
  "SELECT ENERGY POTENCY": "حدد قوة الطاقة",
  "Target [Range] ✦": "الهدف [المدى] ✦",
  "Hold [Scale] ✦": "الاحتجاز [المقياس] ✦",
  "Hold [Duration] ✦": "الاحتجاز [المدة] ✦",
  "Energy [Dice] ✦": "الطاقة [النرد] ✦",
  "Sphere / Category": "المجال / الفئة",
  "Target Range [1-9]": "مدى الهدف [1-9]",
  "Choose how far you wish the spell to travel.": "اختر المسافة التي تريد أن تقطعها التعويذة.",
  "CUSTOM": "مخصص",
  "Hold Scale Magnitude [01-14]": "مقياس حجم الاحتجاز [01-14]",
  "Hold Duration Unit": "وحدة مدة الاحتجاز",
  "INDEX": "الفهرس",
  "DURATION UNIT": "وحدة المدة",
  "Restrict": "قيد",
  "DICE": "النرد",
  "POINTS": "النقاط",
  "SCALE": "المقياس",
  "EXPENSE": "التكلفة",
  "Dekameter": "ديكامتر",
  "Bullet": "رصاصة",
  "Baseball": "كرة بيسبول",
  "Person": "شخص",
  "House": "منزل",
  "City Block": "مربع سكني",
  "City": "مدينة",
  "Moon": "قمر",
  "Earth": "الأرض",
  "Star System": "نظام نجمي",
  "Star Cluster": "تجمع نجمي",
  "Galaxy": "مجرة",
  "Galaxy Cluster": "عنقود مجري",
  "Universe Sector": "قطاع من الكون",
  "Universe": "الكون",
  "Spent": "المستهلك",
  "Expense": "التكلفة",
  "Cast": "إلقاء",
  "Use": "استخدام",
  "Points": "النقاط",
  "Cost": "التكلفة",
  "Update": "تحديث",
  "Archive": "أرشفة",
  "Affinity": "التقارب",
  "Application": "التطبيق",
  "Hold": "الاحتجاز",
  "6-7. Hold": "6-7. الاحتجاز",
  "8. Energy": "8. الطاقة",
  "CURRENT VALUE:": "القيمة الحالية:",
  "e.g. Ignis Vortex": "مثال: دوامة النار",
  "A blast of holy water designed to be used against Black Court Vampires.": "دفقة من الماء المقدس مصممة للاستخدام ضد مصاصي الدماء من البلاط الأسود.",
  "A blast of holy water designed to be used against Black Court Vampires. (ML ٨, تستهدف ١ عقدة (عقد) عبر مدى ٤. الأنواع الفرعية:": "دفقة من الماء المقدس مصممة للاستخدام ضد مصاصي الدماء من البلاط الأسود.",
  "A blast of holy water": "دفقة من الماء المقدس",
  "Black Court Vampires": "مصاصو دماء البلاط الأسود",
  "An arcane forged spell matrix.": "مصفوفة تعويذة غامضة مصاغة.",
  "Give your customized spell a unique name": "امنح تعويذتك المخصصة اسمًا فريدًا",
  "Imbue your magic with epic roleplay flavor description": "اضف لمسة ملحمية من الوصف القصصي لسحرك",
  "A swirling vortex of mystic...": "دوامة دوارة كالأعاصير الغامضة...",
  "Done": "تم",
  "DONE": "تم",
  "Add": "إضافة",
  "Remove": "إزالة",
  "SELECTED": "محدد",
  "Energy Potency [Dice]": "شدة الطاقة [نرد]",
  "Targeting Vectors": "متجهات الاستهداف",
  "Restriction": "القيود الفرعية",

  // Magical Schools
  "Conjuration": "الاستدعاء",
  "Evocation": "الاستحضار",
  "Thaumaturgy": "العجائب السحرية",
  "Veils": "الأستار",
  "Enchantments": "الفتون",
  "Alchemy": "الخيمياء",
  "Exomancy": "خيمياء الفراغ",
  "Chronomancy": "سحر الزمن",
  "Biomancy": "سحر الأحياء",

  // Magical Subtypes
  "Summoning": "الاستدعاء",
  "Creation": "الخلق",
  "Teleportation": "الانتقال الآني",
  "Healing": "الشفاء",
  "Portal": "البوابة",
  "Binding": "التقييد",
  "Force": "القوة",
  "Air": "الهواء",
  "Fire": "النار",
  "Plasma": "البلازما",
  "Sound": "الصوت",
  "Ectoplasm": "المادة الأثيرية",
  "Hellfire": "نار الجحيم",
  "Soulfire": "نار الأرواح",
  "Blessings": "البركات",
  "Curses": "اللعنات",
  "Hexes": "التمائم",
  "Miracles": "المعجزات",
  "Blood Magic": "سحر الدم",
  "Rituals": "الطقوس",
  "Illusion": "الوهم",
  "Invisibility": "الاختفاء",
  "Disguise": "التنكر",
  "Phantasm": "الخيال",
  "Shadow": "الظل",
  "Silence": "الصمت",
  "Charm": "الفتنة",
  "Dominate": "الهيمنة",
  "Sleep": "النوم",
  "Haste": "السرعة",
  "Slow": "التباطؤ",
  "Wards": "الحمايات",
  "Transmutation": "التحويل",
  "Potions": "الجرعات",
  "Elixirs": "العقاقير",
  "Metals": "المعادن",
  "Acids": "الأحماض",
  "Poison": "السم",
  "Gravity": "الجاذبية",
  "Magnetism": "المغناطيسية",
  "Celestial": "سماوي",
  "Void": "الفراغ",
  "Cosmic": "كوني",
  "Lightning": "البرق",
  "Time Recall": "استدعاء الزمن",
  "Stasis": "الركود",
  "Foresight": "الاستبصار",
  "Ageing": "الشيخوخة",
  "Loop": "الحلقة",
  "Acceleration": "التسارع",
  "Regeneration": "التجديد",
  "Shape-shifting": "تحول المظهر",
  "Totems": "الرموز",
  "Evolution": "التطور",
  "Pheromones": "الفرمونات",
  "Parasite": "الطفيل",

  // Restrictions Options inside builder
  "Equip": "تجهيز",
  "Interact": "تفاعل",
  "Alter": "تعديل",
  "Consume": "استهلاك",
  "Ritual": "طقس",
  "Location": "موقع",
  "Time": "زمن",
  "Forfeit": "تنازل",
  "Maintain": "حفاظ",
  "Subject": "موضوع",
  "Name": "اسم",

  "Heal Potion": "جرعة شفاء",
  "Elixir Star": "إكسير النجوم",
  "Star Dust": "غبار النجوم",
  "Restock Pack": "إعادة تعبئة الحقيبة",
  "All magic": "كل السحر",
  "No forged spells yet": "لا توجد تعاويذ مصاغة بعد",
  "No combat spells": "لا توجد تعاويذ قتالية",
  "No auxiliary spells": "لا توجد تعاويذ مساعدة",
  "No transformative spells": "لا توجد تعاويذ تحولية",
  "No forged spells inside combat category.": "لا توجد تعاويذ مصاغة داخل فئة القتال.",
  "No forged spells inside auxiliary category.": "لا توجد تعاويذ مصاغة داخل الفئة المساعدة.",
  "No forged spells inside transformative category.": "لا توجد تعاويذ مصاغة داخل الفئة التحولية.",
  "Create your customized spell matrix using the button above.": "قم بإنشاء مصفوفة التعاويذ المخصصة الخاصة بك باستخدام الزر أعلاه.",
  "Starseeker": "باحث النجوم",
  "Astral Bow": "القوس النجمي",
  "Solar Emblem": "شعار الشمس",
  "Abyssal Portal": "بوابة الهاوية",
  "Main Quest": "المهمة الرئيسية",
  "Side Quest": "مهمة جانبية",
  "Open": "فتح",
  "Behemoth": "وحش العملاق",
  "Leviathan": "تنين البحر",
  "Novaburst": "انفجار النجم الجديد",
  "Spheres": "الكرات",
  "Cosmic Warning": "تحذير كوني",
  "Wait": "انتظار",
  "LEVEL": "مستوى",
  "Live String:": "الصيغة المباشرة:",
  "Minor Health Potion": "جرعة شفاء صغيرة",
  "Restores 10 HP": "يستعيد 10 نقاط حياة",
  "Elixir of Stars": "إكسير النجوم الفاخر",
  "Restores 25 HP": "يستعيد 25 نقطة حياة",
  "Sliver of Star Dust": "شظية غبار النجوم",
  "Adds 8 Temp HP": "يضيف 8 نقاط حياة مؤقتة",
  "Satchel Inventory Items:": "عناصر حقيبة المخزن:",
  "Active Equipment Armory:": "ترسانة المعدات النشطة:",
  "Starseeker Blade": "نصل باحث النجوم",
  "1d10+4 Slash": "1 d10+4 قطع",
  "Forge-tempered obsidian sword sparkling with galaxy specks. Gains advantage if target is bloodied.": "سيف سبج مطروق يتلألأ بنقاط المجرة. يحصل على أفضلية إذا كان الهدف مدمى.",
  "Slash (1d10+4)": "قطع (1d10+4)",
  "Cosmic Arch-Bow": "القوس الكونى المقوس",
  "1d8+5 Radiant": "1 d8+5 إشعاعي",
  "Summoned energy recurve bow drawn from concentrated sunlight rays. Ignores thermal barriers.": "قوس طاقة مستدعى من أشعة الشمس المركزة. يتجاهل الحواجز الحرارية.",
  "Fire (1d8+5)": "إطلاق (1d8+5)",
  "Campaign Quest Tasks:": "مهام مهام الحملة:",
  "Campaign Notebook:": "دفتر ملاحظات الحملة:",
  "Retrieve the Solar Emblem": "استرجع شعار الشمس",
  "Seal the Abyssal Portal Rift": "سد شق بوابة الهاوية",
  "Navigate around the sleeping Wyrm": "التنقل حول التنين النائم",
  "Type your campaign notes here... They will save instantly.": "اكتب ملاحظات حملتك هنا... سيتم حفظها على الفور.",
  "Stellar Behemoth": "العملاق النجمي",
  "Threat CR: 14": "خطورة المستوى: 14",
  "Ancient behemoth composed entirely of high-density stardust and compressed gravitation. Highly resistant to physical slashes, vulnerable to direct Void Gaze attacks.": "عملاق قديم يتكون بالكامل من غبار النجوم عالي الكثافة والجاذبية المضغوطة. مقاوم للغاية للضربات الجسدية، وضعيف أمام هجمات نظرة الفراغ المباشرة.",
  "Chrono-Leviathan": "وحش البحر الزمني",
  "Threat CR: 18": "خطورة المستوى: 18",
  "Sands of time coalesce around its outer skull. It can shift initiative orders, making it crucial to roll d20 initiatives before it acts.": "تتجمع رمال الزمن حول جمجمته الخارجية. يمكنه تغيير ترتيب المبادرة، مما يجعل دحرجة نرد المبادرة (d20) فائق الأهمية قبل أن يتصرف.",
  "Void Lurker": "متربص الفراغ",
  "Threat CR: 8": "خطورة المستوى: 8",
  "A dimensional rift aberration that feasts on magical spell slots. It turns invisible inside nebula zones, requiring thermal sweeps.": "وحش من شق أبعاد يتغذى على خانات التعاويذ السحرية. يصبح غير مرئي داخل مناطق السديم، مما يتطلب مسحًا حراريًا.",
  "† Scroll to unlock deeper scrolls †": "† قم بالتمرير لفتح مخطوطات أعمق †",
  "Cosmic Attunement": "التناغم الكوني",
  "Rune Power": "قوة الرون",
  "Spheres Oracle Wisdom": "حكمة كرات أوراكل",
  "Summon Oracle Warning": "استدعاء تحذير أوراكل",
  "Summoning...": "جاري الاستدعاء...",
  "Channel Novaburst (+3 Temp)": "قناة انفجار النجم الجديد (+3 مؤقت)",
  "All": "الكل",
  "Sphere": "المجال",
  "All Magic": "كل السحر",
  "Magic Level:": "مستوى السحر:",
  "for 1 hour. Can create 1 inanimate": "لمدة ساعة واحدة. يمكن إنشاء مجسم واحد غير حي",
  "a bullet. This laser is optional. e hands' index finger. Rolls 1 dice.": "رصاصة. هذا الليزر اختياري. إصبع السبابة لليد. يرمي 1 نرد",
  "burst": "انفجار",
  "homing": "توجيه",
  "attach": "إرفاق",
  "react": "تفاعل",
  "BURST": "انفجار",
  "HOMING": "توجيه",
  "ATTACH": "إرفاق",
  "REACT": "تفاعل",
  "Burst": "انفجار",
  "Homing": "توجيه",
  "Attach": "إرفاق",
  "React": "تفاعل",
  "CORE": "الجوهر",
  "Core": "الجوهر",
  "core": "الجوهر",
  "V02": "ن02",
  "AFF?": "التقارب؟",
  "Affinity?": "التقارب؟",
};

export function getLanguage(): 'en' | 'ar' {
  return (safeStorage.getItem('setting_user_language') as 'en' | 'ar') || 'en';
}

export function useTranslation() {
  const [lang, setLang] = useState<'en' | 'ar'>(getLanguage);

  useEffect(() => {
    const handleUpdate = () => {
      setLang(getLanguage());
    };
    window.addEventListener('tabletop-state-update', handleUpdate);
    return () => window.removeEventListener('tabletop-state-update', handleUpdate);
  }, []);

  const tn = (text: string | number | null | undefined): string => {
    if (text === null || text === undefined) return '';
    const str = String(text);
    if (lang === 'en') return str;
    return str.replace(/[0-9]/g, (w) => ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'][w.charCodeAt(0) - 48]);
  };

  const t = (text: string | null | undefined): string => {
    if (!text) return '';
    const trimmed = String(text).trim();
    if (lang === 'en') return trimmed;
    
    // Check direct match
    if (arDict[trimmed]) {
      return tn(arDict[trimmed]);
    }
    
    // Case fallbacks
    const lower = trimmed.toLowerCase();
    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (arDict[capitalized]) {
      return tn(arDict[capitalized]);
    }
    if (arDict[lower]) {
      return tn(arDict[lower]);
    }
    
    let result = trimmed;

    // Sequential cleanups and translations for RPG properties
    if (result.startsWith("Count: ")) {
      result = "العدد: " + result.replace(/^Count:\s*/i, "");
    }
    if (result.startsWith("Origin: ")) {
      result = "المنشأ: " + result.replace(/^Origin:\s*/i, "");
    }
    if (result.startsWith("Range: ")) {
      const rangeVal = result.replace(/^Range:\s*/i, "").trim();
      result = "المدى: " + (arDict[rangeVal] || rangeVal);
    }
    if (result.startsWith("Scale: ")) {
      const scaleVal = result.replace(/^Scale:\s*/i, "").trim();
      result = "المقياس: " + (arDict[scaleVal] || scaleVal);
    }
    if (result.startsWith("Duration: ")) {
      const durVal = result.replace(/^Duration:\s*/i, "").trim();
      result = "المدة: " + (arDict[durVal] || durVal);
    }
    if (result.startsWith("Level ")) {
      result = result.replace(/^Level\s+/i, "المستوى ");
    }
    if (result.includes("Source")) {
      result = result.replace(/Source/gi, "مصدر");
    }
    if (result.startsWith("Tier: ")) {
      result = result.replace(/^Tier:\s*/i, "فئة: ");
    }
    if (result.endsWith(" Dice")) {
      result = result.replace(/ Dice$/i, " نرد");
    }
    if (result.endsWith(" Points")) {
      result = result.replace(/ Points$/i, " نقاط");
    }
    if (result.endsWith(" Cost")) {
      result = result.replace(/ Cost$/i, " تكلفة");
    }

    // Dynamic contextual replacements for spell builder generation strings or user inputs
    result = result
      .replace(/Arcane forged spell/gi, "تعويذة مصاغة غامضة")
      .replace(/Magic Level/gi, "المستوى السحري")
      .replace(/targeting/gi, "تستهدف")
      .replace(/node\(s\)/gi, "عقدة (عقد)")
      .replace(/over range/gi, "عبر مدى")
      .replace(/Sum of costs is/gi, "مجموع التكاليف")
      .replace(/Cost:/gi, "التكلفة:")
      .replace(/Total with points:/gi, "الإجمالي بالنقاط:")
      .replace(/Mana/gi, "مانا")
      .replace(/sub-types/gi, "الأنواع الفرعية")
      .replace(/for 1 hour/gi, "لمدة ساعة واحدة")
      .replace(/Can create 1 inanimate/gi, "يمكنها إنشاء مجسم واحد غير حي")
      .replace(/inanimate/gi, "غير حي")
      .replace(/a bullet/gi, "رصاصة")
      .replace(/This laser is optional/gi, "هذا الليزر اختياري")
      .replace(/and laser is optional/gi, "والليزر اختياري")
      .replace(/laser is optional/gi, "الليزر اختياري")
      .replace(/Second hand's index finger/gi, "إصبع السبابة لليد الثانية")
      .replace(/Second hand's/gi, "اليد الثانية")
      .replace(/Second/gi, "الثانية")
      .replace(/hands' index finger/gi, "إصبع السبابة لليد")
      .replace(/hand's index finger/gi, "إصبع السبابة لليد")
      .replace(/index finger/gi, "إصبع السبابة")
      .replace(/Rolls 1 dice/gi, "يقوم برمي ١ نرد")
      .replace(/Rolls (\d+) dice/gi, (_, n) => `يقوم برمي ${n} نرد`)
      .replace(/A blast of holy water/gi, "دفقة من الماء المقدس")
      .replace(/designed to be used against Black Court Vampires/gi, "مصممة للاستخدام ضد مصاصي الدماء من البلاط الأسود")
      .replace(/Black Court Vampires/gi, "مصاصي دماء البلاط الأسود")
      .replace(/\bburst\b/gi, "انفجار")
      .replace(/\bhoming\b/gi, "توجيه")
      .replace(/\battach\b/gi, "إرفاق")
      .replace(/\breact\b/gi, "تفاعل")
      .replace(/\band\b/gi, "و")
      .replace(/\bor\b/gi, "أو")
      .replace(/\bwith\b/gi, "مع")
      .replace(/\bfor\b/gi, "لأجل");

    return tn(result);
  };

  return { 
    lang, 
    t, 
    tn,
    setLang: (newLang: 'en' | 'ar') => {
      safeStorage.setItem('setting_user_language', newLang);
      window.dispatchEvent(new Event('tabletop-state-update'));
    }
  };
}

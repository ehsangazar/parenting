export interface DailyTip {
  key: string;
  title: string;
  body: string;
}

const EN_TIPS: DailyTip[] = [
  { key: "narrate-day", title: "Narrate the day", body: "Talk aloud about what you're doing. Even mundane errands grow vocabulary." },
  { key: "two-choices", title: "Offer two choices", body: "When a meltdown looms, give two acceptable options. Control + simplicity." },
  { key: "delayed-response", title: "Wait three seconds", body: "Pause before answering 'why?' questions. Let them keep wondering." },
  { key: "label-feelings", title: "Name the feeling", body: "Reflect their emotion before solving anything: 'You're frustrated this broke.'" },
  { key: "physical-yes", title: "Say yes with your body", body: "Toddlers read posture more than words. Squat to their height before talking." },
  { key: "one-on-one", title: "Ten focused minutes", body: "Phone in another room. Ten minutes of undistracted play resets connection." },
  { key: "predict-transitions", title: "Pre-announce transitions", body: "'Two more pushes on the swing, then home.' Cuts transition battles in half." },
  { key: "praise-effort", title: "Praise the trying", body: "'You kept going even when it was hard' beats 'You're so smart' every time." },
  { key: "outside-twenty", title: "Twenty minutes outside", body: "Any weather. Outdoor time predicts better sleep tonight." },
  { key: "read-five-min", title: "Five minutes of reading", body: "Same book is fine. Repetition is how they learn the rhythm of language." },
  { key: "boring-after-7", title: "Boring after 7pm", body: "Dim lights, quiet voices, slow movements. Their nervous system mirrors yours." },
  { key: "ask-instead", title: "Ask, don't tell", body: "'What's your job before we leave?' beats 'Put your shoes on!' Builds ownership." },
  { key: "repair", title: "Repair, don't blame", body: "After a hard moment, return calmly: 'That was tough. We're okay.' Models forgiveness." },
  { key: "play-floor", title: "Get on the floor", body: "Play at their level for five minutes. They'll feel seen for the rest of the day." },
  { key: "water-snack", title: "Water + snack check", body: "Most 'bad behavior' before lunch is actually low blood sugar or thirst." },
  { key: "single-instruction", title: "One instruction at a time", body: "Under 5s can hold only one direction. Don't stack them." },
  { key: "name-rules", title: "Name the rule, not the child", body: "'We're gentle with the cat' beats 'Stop being rough!'" },
  { key: "sleep-anchor", title: "Anchor wake time", body: "Same wake time, weekends included. It's the single biggest lever on bedtime." },
  { key: "validate-no", title: "Validate before redirecting", body: "'I know you want it. We can't right now.' Skips the power struggle." },
  { key: "talk-feelings", title: "Tell them yours", body: "'I felt sad today and I took a walk.' Models that feelings are normal." },
  { key: "limit-questions", title: "Limit your questions", body: "Comment instead. 'You built a tall one' invites more than 'What did you build?'" },
  { key: "play-rough", title: "Roughhouse for 10 minutes", body: "Wrestle, chase, pillow fight. Burns cortisol, builds connection." },
  { key: "screen-pre-warn", title: "Pre-warn screen ends", body: "'Five minutes, then off.' Set a timer they can hear. Removes you as the bad guy." },
  { key: "silent-watching", title: "Watch them play", body: "Sit silently for two minutes. You'll learn what they're working on." },
  { key: "name-strategy", title: "Name their strategy", body: "'You tried two ways before it worked' makes problem-solving visible." },
  { key: "tomorrow", title: "End the day clean", body: "Tomorrow is a new day. Don't carry today's hard moment into tonight's bedtime." },
  { key: "boredom-good", title: "Let them be bored", body: "Boredom is the doorway to imagination. Don't rush to fill it." },
  { key: "thank-help", title: "Thank specific help", body: "'Thanks for putting the cups away' lands harder than 'Good helping!'" },
  { key: "ignore-strategy", title: "Plan what to ignore", body: "Some behaviors (whining for attention) shrink fastest when ignored consistently." },
  { key: "self-care-15", title: "Fifteen minutes for you", body: "Coffee on the porch counts. Refilled parents are calmer parents." },
];

const FA_TIPS: DailyTip[] = [
  { key: "narrate-day", title: "روز را روایت کنید", body: "بلند درباره کاری که می‌کنید حرف بزنید. حتی کارهای روزمره دایره واژگان را گسترش می‌دهد." },
  { key: "two-choices", title: "دو گزینه بدهید", body: "هنگام بحران، دو گزینه قابل قبول ارائه دهید. کنترل + سادگی." },
  { key: "delayed-response", title: "سه ثانیه صبر کنید", body: "قبل از پاسخ دادن به سؤال «چرا؟» مکث کنید. بگذارید کنجکاوی کنند." },
  { key: "label-feelings", title: "احساس را نام ببرید", body: "قبل از حل کردن، احساس آن‌ها را منعکس کنید: «ناراحتی که شکست»." },
  { key: "physical-yes", title: "با بدن «بله» بگویید", body: "نوپاها زبان بدن را بیشتر از کلمات می‌فهمند. هم‌قد آن‌ها شوید." },
  { key: "one-on-one", title: "ده دقیقه تمرکز کامل", body: "گوشی در اتاق دیگر. ده دقیقه بازی بدون حواس‌پرتی، رابطه را بازسازی می‌کند." },
  { key: "predict-transitions", title: "تغییرها را از قبل اعلام کنید", body: "«دو تاب دیگر، بعد خانه.» نیمی از کشمکش‌ها را حذف می‌کند." },
  { key: "praise-effort", title: "تلاش را تحسین کنید", body: "«ادامه دادی حتی وقتی سخت بود» بهتر از «خیلی باهوشی» است." },
  { key: "outside-twenty", title: "بیست دقیقه فضای باز", body: "در هر هوایی. زمان فضای باز، خواب شب را بهتر می‌کند." },
  { key: "read-five-min", title: "پنج دقیقه کتاب", body: "حتی یک کتاب تکراری. تکرار، آهنگ زبان را یاد می‌دهد." },
  { key: "boring-after-7", title: "بعد از ۷ شب آرام", body: "نور کم، صدای آرام، حرکت کند. سیستم عصبی‌شان آینه شماست." },
  { key: "ask-instead", title: "بپرسید، نگویید", body: "«قبل از رفتن وظیفه‌ات چیه؟» بهتر از «کفش‌ها رو بپوش!» است." },
  { key: "repair", title: "ترمیم کنید، نه سرزنش", body: "بعد از لحظه سخت، آرام برگردید: «سخت بود. اشکالی نداره.»" },
  { key: "play-floor", title: "روی زمین بنشینید", body: "پنج دقیقه در سطح آن‌ها بازی کنید. تمام روز احساس دیده‌شدن خواهند کرد." },
  { key: "water-snack", title: "آب و میان‌وعده", body: "بیشتر «رفتار بد» قبل از ناهار، گرسنگی یا تشنگی است." },
  { key: "single-instruction", title: "یک دستور در یک زمان", body: "بچه‌های زیر ۵ سال فقط یک دستور را نگه می‌دارند. روی هم نگذارید." },
  { key: "name-rules", title: "قانون را نام ببرید، نه کودک را", body: "«با گربه مهربون هستیم» بهتر از «اذیت نکن!» است." },
  { key: "sleep-anchor", title: "زمان بیداری ثابت", body: "زمان بیداری ثابت، حتی آخر هفته‌ها. بزرگ‌ترین اهرم برای خواب شب." },
  { key: "validate-no", title: "قبل از تغییر مسیر، تأیید کنید", body: "«می‌دونم می‌خوای. الان نمی‌تونیم.» از کشمکش جلوگیری می‌کند." },
  { key: "talk-feelings", title: "احساسات خود را بگویید", body: "«امروز ناراحت بودم و قدم زدم.» نشان می‌دهد احساسات طبیعی است." },
  { key: "limit-questions", title: "سؤال کمتر بپرسید", body: "نظر بدهید. «بلند ساختی» بیشتر از «چی ساختی؟» جواب می‌گیرد." },
  { key: "play-rough", title: "ده دقیقه بازی پر‌جنب‌و‌جوش", body: "کشتی، تعقیب، بالش‌بازی. کورتیزول را می‌سوزاند، رابطه را می‌سازد." },
  { key: "screen-pre-warn", title: "پایان تماشا را از قبل بگویید", body: "«پنج دقیقه دیگه، تموم.» تایمر تنظیم کنید. شما را از مقصر بودن خارج می‌کند." },
  { key: "silent-watching", title: "بازی کردنشان را تماشا کنید", body: "دو دقیقه ساکت بنشینید. می‌فهمید روی چه چیزی کار می‌کنند." },
  { key: "name-strategy", title: "راهبردشان را نام ببرید", body: "«دو راه امتحان کردی تا جواب داد» حل‌مسئله را قابل دیدن می‌کند." },
  { key: "tomorrow", title: "روز را تمیز تمام کنید", body: "فردا روز جدیدی است. لحظه سخت امروز را به وقت خواب امشب نکشانید." },
  { key: "boredom-good", title: "بگذارید حوصله‌شان سر برود", body: "بی‌حوصلگی دروازه تخیل است. عجله نکنید برای پر کردنش." },
  { key: "thank-help", title: "از کمک مشخص تشکر کنید", body: "«ممنون که لیوان‌ها رو گذاشتی» قوی‌تر از «آفرین، کمک‌کار خوبی» است." },
  { key: "ignore-strategy", title: "برنامه‌ریزی برای نادیده گرفتن", body: "بعضی رفتارها (غرغر برای توجه) با نادیده گرفتن مداوم سریع‌تر کم می‌شوند." },
  { key: "self-care-15", title: "پانزده دقیقه برای خودتان", body: "یک قهوه در ایوان هم حساب است. والدین پر، آرام‌ترند." },
];

export const tipForDate = (locale: string, date: Date): DailyTip => {
  const tips = locale.startsWith("fa") ? FA_TIPS : EN_TIPS;
  const dayOfYear = Math.floor(
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      Date.UTC(date.getUTCFullYear(), 0, 0)) /
      (24 * 60 * 60 * 1000),
  );
  return tips[dayOfYear % tips.length];
};

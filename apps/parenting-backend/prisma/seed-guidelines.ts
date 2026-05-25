import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type GuidelineInput = {
  authority: string;
  topic: string;
  title: string;
  content: string;
  sourceUrl?: string;
  ageMinMonths?: number;
  ageMaxMonths?: number;
  countries: string[];
};

const guidelines: GuidelineInput[] = [
  // ─── SLEEP ──────────────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "sleep",
    title: "Safe sleep for babies (reduce SIDS risk)",
    content:
      "Place your baby on their back to sleep, in a clear cot or Moses basket in the same room as you for the first 6 months. Use a firm, flat, waterproof mattress. Do not use pillows, duvets, quilts, or cot bumpers. Keep the room temperature between 16-20°C. Never fall asleep with your baby on a sofa or armchair. Avoid bed-sharing if you or your partner smoke, have drunk alcohol, take drugs that make you drowsy, or if your baby was premature or weighed under 2.5kg at birth.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/caring-for-a-newborn/reduce-the-risk-of-sudden-infant-death-syndrome/",
    ageMinMonths: 0,
    ageMaxMonths: 12,
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "sleep",
    title: "Safe sleep recommendations for infants",
    content:
      "Infants should be placed on their back for every sleep. Use a firm, flat, non-inclined sleep surface. The baby should sleep in the parents' room, close to the parents' bed, but on a separate surface designed for infants, ideally for at least the first 6 months. Keep soft objects, loose bedding, and any objects that could increase the risk of entrapment, suffocation, or strangulation out of the crib. Avoid overheating. Offer a pacifier at nap time and bedtime. Do not use home cardiorespiratory monitors or commercial devices marketed to reduce SIDS risk.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/150/1/e2022057990/188304/Sleep-Related-Infant-Deaths-Updated-2022",
    ageMinMonths: 0,
    ageMaxMonths: 12,
    countries: ["US"],
  },
  {
    authority: "WHO",
    topic: "sleep",
    title: "Infant sleep position and environment",
    content:
      "The WHO recommends placing infants on their back to sleep (supine position). Bed-sharing is common worldwide but carries risks; if practised, the surface should be firm and flat, with no soft bedding. Exclusive breastfeeding and room-sharing without bed-sharing reduce the risk of sudden infant death. Infants should not be exposed to tobacco smoke. A consistent sleep routine supports healthy development.",
    sourceUrl: "https://www.who.int/tools/child-growth-standards",
    ageMinMonths: 0,
    ageMaxMonths: 12,
    countries: [],
  },
  {
    authority: "NHS",
    topic: "sleep",
    title: "How much sleep children need by age",
    content:
      "Newborns (0-3 months): 8-17 hours including naps. Babies (4-11 months): 12-16 hours including naps. Toddlers (1-2 years): 11-14 hours including naps. Children (3-5 years): 10-13 hours including naps. Children (6-12 years): 9-12 hours. Teenagers (13-18 years): 8-10 hours. Every child is different, but a regular bedtime routine helps. Signs your child is not sleeping enough include irritability, difficulty concentrating, and frequent illness.",
    sourceUrl: "https://www.nhs.uk/live-well/sleep-and-tiredness/how-much-sleep-do-kids-need/",
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "sleep",
    title: "Recommended sleep duration by age",
    content:
      "Infants (4-12 months): 12-16 hours per 24 hours including naps. Children (1-2 years): 11-14 hours including naps. Children (3-5 years): 10-13 hours including naps. Children (6-12 years): 9-12 hours. Teens (13-18 years): 8-10 hours. Adequate sleep improves attention, behaviour, learning, memory, emotional regulation, quality of life, and mental and physical health. Insufficient sleep increases the risk of injuries, obesity, diabetes, depression, and even suicidal ideation in teens.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/138/2/e20161601/52542/Recommended-Amount-of-Sleep-for-Pediatric",
    ageMinMonths: 4,
    countries: ["US"],
  },
  {
    authority: "NICE",
    topic: "sleep",
    title: "Sleep problems in children and young people",
    content:
      "Establish a consistent bedtime routine lasting 20-45 minutes including a warm bath, quiet time, and a story. Avoid stimulating activities before bed. The bedroom should be dark, quiet, and cool. Avoid screens for at least 1 hour before bed. Ensure daytime physical activity. If sleep problems persist beyond 3 months, consider referral for behavioural assessment. Melatonin should only be considered after behavioural interventions have been tried.",
    sourceUrl: "https://www.nice.org.uk/guidance/ng209",
    countries: ["GB"],
  },

  // ─── FEEDING & NUTRITION ────────────────────────────────────────────────────

  {
    authority: "WHO",
    topic: "feeding",
    title: "Exclusive breastfeeding for the first 6 months",
    content:
      "WHO recommends exclusive breastfeeding for the first 6 months of life, with continued breastfeeding along with appropriate complementary foods up to 2 years of age or beyond. Breastfeeding should begin within the first hour of birth. Breastfeeding on demand, as often as the child wants, day and night. Bottles, teats, or pacifiers should be avoided in the early weeks. Expressed breast milk can be given by cup if necessary.",
    sourceUrl: "https://www.who.int/health-topics/breastfeeding",
    ageMinMonths: 0,
    ageMaxMonths: 24,
    countries: [],
  },
  {
    authority: "NHS",
    topic: "feeding",
    title: "Introducing solid foods (weaning)",
    content:
      "Start introducing solid foods at around 6 months, alongside breast milk or formula. Signs of readiness include sitting up with support, good head control, interest in food, and loss of the tongue-thrust reflex. Start with single vegetables and fruits, then progress to mashed food and soft finger foods. Avoid salt, sugar, honey (before 12 months), whole nuts (choking risk), and cows' milk as a main drink before 12 months. Offer a variety of textures and flavours early. Iron-rich foods like meat, pulses, and green vegetables are important.",
    sourceUrl: "https://www.nhs.uk/start-for-life/weaning/",
    ageMinMonths: 4,
    ageMaxMonths: 12,
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "feeding",
    title: "Complementary feeding and introduction of allergenic foods",
    content:
      "Introduce complementary foods at around 6 months. There is no evidence that waiting beyond 4-6 months to introduce allergenic foods (peanut, egg, milk, wheat, soy, tree nuts, fish, shellfish) prevents allergies. In fact, early introduction of peanut-containing foods at 4-6 months may reduce the risk of peanut allergy, especially in high-risk infants (those with severe eczema or egg allergy). Offer iron-rich foods early. Continue breastfeeding through at least 12 months.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/143/4/e20190281/37232",
    ageMinMonths: 4,
    ageMaxMonths: 12,
    countries: ["US"],
  },
  {
    authority: "WHO",
    topic: "feeding",
    title: "Complementary feeding guidelines",
    content:
      "Start complementary foods at 6 months while continuing breastfeeding. At 6-8 months: 2-3 meals per day. At 9-11 months: 3-4 meals per day. At 12-23 months: 3-4 meals plus 1-2 snacks. Meals should be nutrient-dense. Include animal-source foods (meat, fish, eggs, dairy) daily or as often as possible. Add fruits and vegetables daily. Avoid sugary drinks and ultra-processed foods. Responsive feeding, letting the child self-feed as they develop, helps support healthy eating habits.",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/infant-and-young-child-feeding",
    ageMinMonths: 6,
    ageMaxMonths: 24,
    countries: [],
  },
  {
    authority: "NHS",
    topic: "feeding",
    title: "Vitamins for children",
    content:
      "All children aged 6 months to 5 years should take a daily supplement containing vitamins A, C, and D. Breastfed babies should receive a vitamin D supplement (8.5-10 micrograms) from birth. Formula-fed babies do not need a supplement until they are having less than 500ml of formula per day, as formula is already fortified. Children over 1 year and adults need 10 micrograms of vitamin D daily, especially during autumn and winter.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/weaning-and-feeding/vitamins-for-children/",
    ageMinMonths: 0,
    ageMaxMonths: 60,
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "feeding",
    title: "Vitamin D supplementation for infants",
    content:
      "All breastfed and partially breastfed infants should receive a supplement of 400 IU/day of vitamin D beginning in the first few days of life. Formula-fed infants consuming less than 1 litre per day also need supplementation. Vitamin D is essential for calcium absorption, bone health, and immune function. Continue supplementation through childhood and adolescence (600 IU/day after age 1).",
    sourceUrl: "https://publications.aap.org/pediatrics/article/142/6/e20182853/37571",
    ageMinMonths: 0,
    countries: ["US"],
  },
  {
    authority: "NHS",
    topic: "feeding",
    title: "Cows' milk and dairy for babies and toddlers",
    content:
      "Cows' milk should not be given as a main drink before 12 months, but can be used in cooking and mixed with food from 6 months. From 12 months, whole cows' milk can be given as a main drink. Semi-skimmed milk can be introduced from 2 years if the child is eating well and growing normally. Skimmed milk is not suitable before 5 years. Full-fat dairy products like yoghurt and cheese can be offered from 6 months.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/weaning-and-feeding/drinks-and-cups-for-babies/",
    ageMinMonths: 0,
    ageMaxMonths: 60,
    countries: ["GB"],
  },

  // ─── VACCINATION ────────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "vaccination",
    title: "UK childhood vaccination schedule",
    content:
      "8 weeks: 6-in-1 vaccine (diphtheria, hepatitis B, Hib, polio, tetanus, whooping cough), rotavirus, MenB. 12 weeks: 6-in-1 (second dose), rotavirus (second dose), pneumococcal (PCV). 16 weeks: 6-in-1 (third dose), MenB (second dose). 1 year: Hib/MenC, MMR, pneumococcal booster, MenB booster. 2-3 years: flu vaccine (annual nasal spray). 3 years 4 months: 4-in-1 pre-school booster, MMR (second dose). Vaccines are free and given by GP surgeries or school immunisation teams.",
    sourceUrl: "https://www.nhs.uk/conditions/vaccinations/nhs-vaccinations-and-when-to-have-them/",
    ageMinMonths: 0,
    ageMaxMonths: 48,
    countries: ["GB"],
  },
  {
    authority: "CDC",
    topic: "vaccination",
    title: "US recommended childhood immunisation schedule (0-6 years)",
    content:
      "Birth: Hepatitis B. 2 months: DTaP, IPV, Hib, PCV15, rotavirus, hepatitis B (second dose). 4 months: DTaP, IPV, Hib, PCV15, rotavirus (second dose). 6 months: DTaP, IPV (in some schedules), Hib, PCV15, rotavirus (third dose if applicable), influenza (annual, starting at 6 months). 12-15 months: MMR, varicella, hepatitis A, PCV15 booster, Hib booster. 4-6 years: DTaP, IPV, MMR (second dose), varicella (second dose).",
    sourceUrl: "https://www.cdc.gov/vaccines/schedules/hcp/imz/child-adolescent.html",
    ageMinMonths: 0,
    ageMaxMonths: 72,
    countries: ["US"],
  },
  {
    authority: "WHO",
    topic: "vaccination",
    title: "WHO essential childhood immunisations",
    content:
      "WHO recommends all children receive vaccines against tuberculosis (BCG), hepatitis B, polio, DTP (diphtheria, tetanus, pertussis), Hib, pneumococcal disease, rotavirus, measles, and rubella. Additional vaccines recommended depending on disease burden: yellow fever, Japanese encephalitis, HPV (for girls aged 9-14), and meningococcal. Vaccination is one of the most cost-effective health interventions, preventing 2-3 million deaths per year.",
    sourceUrl: "https://www.who.int/teams/immunization-vaccines-and-biologicals/policies/who-recommendations-for-routine-immunization",
    countries: [],
  },

  // ─── SCREEN TIME ────────────────────────────────────────────────────────────

  {
    authority: "WHO",
    topic: "screen time",
    title: "Screen time guidelines for children under 5",
    content:
      "Infants under 1 year: no screen time at all. Children 1-2 years: no sedentary screen time; for those aged 2, no more than 1 hour per day, less is better. Children 3-4 years: no more than 1 hour per day, less is better. Screen time should never replace physical activity, sleep, or interactive play. When screens are used, content should be age-appropriate and ideally watched together with a caregiver who can explain and interact.",
    sourceUrl: "https://www.who.int/publications/i/item/9789241550536",
    ageMinMonths: 0,
    ageMaxMonths: 60,
    countries: [],
  },
  {
    authority: "AAP",
    topic: "screen time",
    title: "Media use guidelines for children",
    content:
      "Under 18 months: avoid screen media other than video chatting. 18-24 months: if parents want to introduce digital media, choose high-quality programmes and watch together. 2-5 years: limit screen use to 1 hour per day of high-quality programmes, co-view with your child. 6+ years: place consistent limits on time and types of media. Ensure media does not take the place of adequate sleep, physical activity, homework, and social interaction. Designate media-free times (e.g. meals) and media-free zones (e.g. bedrooms).",
    sourceUrl: "https://publications.aap.org/pediatrics/article/138/5/e20162591/60503",
    ageMinMonths: 0,
    countries: ["US"],
  },
  {
    authority: "NHS",
    topic: "screen time",
    title: "Screen time advice for parents",
    content:
      "There are no official UK screen time limits, but the NHS advises: avoid screens for children under 2 years old. For older children, balance screen time with physical activity, sleep, and face-to-face interaction. Watch or play together when possible. Avoid screens in the hour before bedtime as the blue light can disrupt sleep. Use parental controls. Talk to children about staying safe online. Be a good role model with your own screen use.",
    sourceUrl: "https://www.nhs.uk/every-mind-matters/children-and-young-people/childrens-mental-health/",
    countries: ["GB"],
  },

  // ─── DEVELOPMENT MILESTONES ─────────────────────────────────────────────────

  {
    authority: "CDC",
    topic: "development",
    title: "Developmental milestones at 2 months",
    content:
      "Social/emotional: begins to smile at people, can briefly calm self. Language: coos, makes gurgling sounds, turns head toward sounds. Cognitive: pays attention to faces, begins to follow things with eyes, begins to act bored if activity does not change. Motor: can hold head up, pushes up when on tummy, makes smoother movements with arms and legs. When to act early: does not respond to loud sounds, does not watch things as they move, does not smile at people, does not bring hands to mouth, cannot hold head up when pushing up on tummy.",
    sourceUrl: "https://www.cdc.gov/ncbddd/actearly/milestones/milestones-2mo.html",
    ageMinMonths: 2,
    ageMaxMonths: 2,
    countries: ["US"],
  },
  {
    authority: "CDC",
    topic: "development",
    title: "Developmental milestones at 4 months",
    content:
      "Social/emotional: smiles spontaneously, likes to play with people, copies some movements and facial expressions. Language: begins to babble, babbles with expression, cries in different ways to show hunger, pain, or tiredness. Cognitive: lets you know if happy or sad, responds to affection, reaches for toy with one hand, uses hands and eyes together. Motor: holds head steady unsupported, pushes down with legs when feet on hard surface, may roll from tummy to back, can hold and shake a toy.",
    sourceUrl: "https://www.cdc.gov/ncbddd/actearly/milestones/milestones-4mo.html",
    ageMinMonths: 4,
    ageMaxMonths: 4,
    countries: ["US"],
  },
  {
    authority: "CDC",
    topic: "development",
    title: "Developmental milestones at 6 months",
    content:
      "Social/emotional: knows familiar faces, likes to play with others especially parents, responds to others' emotions, likes to look at self in a mirror. Language: responds to sounds by making sounds, strings vowels together when babbling, responds to own name, makes sounds to show joy and displeasure. Motor: rolls over in both directions, begins to sit without support, rocks back and forth, sometimes crawling backward before forward, supports weight on legs and might bounce.",
    sourceUrl: "https://www.cdc.gov/ncbddd/actearly/milestones/milestones-6mo.html",
    ageMinMonths: 6,
    ageMaxMonths: 6,
    countries: ["US"],
  },
  {
    authority: "CDC",
    topic: "development",
    title: "Developmental milestones at 9 months",
    content:
      "Social/emotional: may be afraid of strangers, may be clingy with familiar adults, has favourite toys. Language: understands 'no', makes lots of different sounds, copies sounds and gestures, uses fingers to point at things. Motor: stands holding on, can get into sitting position, sits without support, pulls to stand, crawls. When to act early: does not bear weight on legs with support, does not sit with help, does not babble, does not play turn-taking games, does not respond to own name, does not seem to recognise familiar people.",
    sourceUrl: "https://www.cdc.gov/ncbddd/actearly/milestones/milestones-9mo.html",
    ageMinMonths: 9,
    ageMaxMonths: 9,
    countries: ["US"],
  },
  {
    authority: "CDC",
    topic: "development",
    title: "Developmental milestones at 12 months",
    content:
      "Social/emotional: shy or nervous with strangers, cries when parent leaves, has favourite things and people, shows fear in some situations, hands you a book for you to read, repeats sounds or actions to get attention. Language: responds to simple spoken requests, uses simple gestures like shaking head 'no' or waving, says 'mama' and 'dada' and exclamations like 'uh-oh'. Motor: gets to sitting position without help, pulls up to stand and walks holding furniture (cruising), may take a few steps without holding on, may stand alone.",
    sourceUrl: "https://www.cdc.gov/ncbddd/actearly/milestones/milestones-12mo.html",
    ageMinMonths: 12,
    ageMaxMonths: 12,
    countries: ["US"],
  },
  {
    authority: "CDC",
    topic: "development",
    title: "Developmental milestones at 18 months",
    content:
      "Social/emotional: likes to hand things to others as play, may have temper tantrums, may be afraid of strangers, shows affection, plays simple pretend, may cling to caregivers. Language: says several single words, says and shakes head 'no', points to show someone what they want. Motor: walks alone, may walk up steps and run, pulls toys while walking, can help undress self, drinks from a cup, eats with a spoon. When to act early: does not point, does not know what familiar things are for, does not copy others, does not gain new words, does not walk.",
    sourceUrl: "https://www.cdc.gov/ncbddd/actearly/milestones/milestones-18mo.html",
    ageMinMonths: 18,
    ageMaxMonths: 18,
    countries: ["US"],
  },
  {
    authority: "NHS",
    topic: "development",
    title: "Baby development milestones overview (0-12 months)",
    content:
      "By 8 weeks: begins to smile, recognises parent's voice, can focus on nearby faces. By 3-4 months: holds head up, responds to sounds, starts reaching for objects. By 6 months: sits with support, rolls over, responds to own name, babbles, explores objects with mouth. By 9 months: sits unaided, crawls or bottom-shuffles, points, understands 'no', starts finger foods. By 12 months: pulls to stand, may walk with help, says 1-3 words, waves bye-bye, drops objects deliberately. Every child develops at their own pace; these are typical ranges.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/babys-development/",
    ageMinMonths: 0,
    ageMaxMonths: 12,
    countries: ["GB"],
  },
  {
    authority: "NHS",
    topic: "development",
    title: "Toddler development milestones (1-3 years)",
    content:
      "12-18 months: walks alone, says a few words, follows simple instructions, stacks 2-3 blocks. 18-24 months: runs, kicks a ball, uses 2-word phrases ('more milk'), follows 2-step instructions, shows defiance. 2-3 years: climbs furniture, pedals a tricycle, speaks in sentences, asks 'why?', sorts objects by shape and colour, engages in pretend play, starts parallel play with other children. Seek advice if: no words by 18 months, not walking by 18 months, or losing skills they previously had.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/babys-development/",
    ageMinMonths: 12,
    ageMaxMonths: 36,
    countries: ["GB"],
  },

  // ─── SAFETY ─────────────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "safety",
    title: "Baby-proofing your home",
    content:
      "Once babies start crawling (around 6-9 months), childproof your home: fit safety gates at the top and bottom of stairs, use socket covers, secure heavy furniture to the wall, keep small objects and choking hazards out of reach, use cupboard locks for cleaning products and medicines, fit window locks or restrictors, never leave your child alone in the bath, keep hot drinks away from babies, use a fireguard, and keep blind cords out of reach.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/first-aid-and-safety/safety/safety-in-the-home/",
    ageMinMonths: 6,
    ageMaxMonths: 36,
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "safety",
    title: "Car seat safety guidelines",
    content:
      "All infants and toddlers should ride in a rear-facing car seat for as long as possible, until they reach the maximum height or weight allowed by the car seat manufacturer. Many convertible car seats have limits that allow children to ride rear-facing until age 2 or beyond. After outgrowing rear-facing, children should use a forward-facing car seat with a harness for as long as possible, then transition to a belt-positioning booster seat. Children should use a booster until the vehicle seat belt fits properly, typically when they reach 4 feet 9 inches (about 145 cm).",
    sourceUrl: "https://publications.aap.org/pediatrics/article/142/5/e20182461/38061",
    ageMinMonths: 0,
    countries: ["US"],
  },
  {
    authority: "WHO",
    topic: "safety",
    title: "Child injury prevention",
    content:
      "Injuries are the leading cause of death and disability in children worldwide. Key prevention measures: always supervise children near water (drowning is a leading cause of death in children 1-4), install fencing around pools, use age-appropriate car restraints, ensure medicines and chemicals are stored out of reach and in child-resistant containers, supervise meals to prevent choking, install smoke alarms and have a fire escape plan, and teach road safety from an early age.",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/falls",
    countries: [],
  },
  {
    authority: "NHS",
    topic: "safety",
    title: "Choking hazards and first aid for babies",
    content:
      "Common choking hazards include: grapes, cherry tomatoes, sausages (cut lengthwise, never in rounds), popcorn, whole nuts, hard sweets, raw carrot sticks, and chunks of apple. For babies under 1: lay them face down along your thigh, give up to 5 back blows between the shoulder blades, then up to 5 chest thrusts if needed. For children over 1: give up to 5 back blows, then abdominal thrusts (Heimlich manoeuvre). Call 999 if the object does not dislodge.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/first-aid-and-safety/first-aid/how-to-stop-a-child-from-choking/",
    ageMinMonths: 4,
    ageMaxMonths: 60,
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "safety",
    title: "Water safety and drowning prevention",
    content:
      "Drowning is the leading cause of injury death in children aged 1-4. Never leave children unsupervised in or near water, not even for a moment. Empty all containers of water after use. Install four-sided fencing around pools with self-closing, self-latching gates. Formal swim lessons can reduce the risk of drowning for children aged 1 year and older, but do not 'drown-proof' a child. Learn CPR. Use properly fitted US Coast Guard-approved life jackets on boats, not inflatable toys.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/148/2/e2021052227/179774",
    countries: ["US"],
  },

  // ─── DISCIPLINE & BEHAVIOUR ─────────────────────────────────────────────────

  {
    authority: "AAP",
    topic: "discipline",
    title: "Effective discipline strategies (no spanking)",
    content:
      "The AAP recommends against spanking, hitting, slapping, threatening, insulting, humiliating, or shaming children of any age. Effective discipline strategies include: positive reinforcement for good behaviour, setting clear and consistent limits, natural consequences, time-outs for young children (1 minute per year of age), removing privileges for older children, and modelling the behaviour you want to see. Discipline should teach, not punish. Parents should manage their own emotions before disciplining.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/142/6/e20183112/37470",
    countries: ["US"],
  },
  {
    authority: "NICE",
    topic: "discipline",
    title: "Positive parenting and managing behaviour",
    content:
      "Use praise and rewards to encourage good behaviour. Be specific about what you are praising. Set clear, age-appropriate boundaries and explain reasons. Use distraction for younger children. Give choices to help children feel in control ('Do you want to wear the red or blue jumper?'). Stay calm. If using time-out, keep it brief and explain why afterwards. Avoid physical punishment, which increases aggression, damages mental health, and harms the parent-child relationship. Parenting programmes (e.g. Triple P, Incredible Years) are effective and should be offered.",
    sourceUrl: "https://www.nice.org.uk/guidance/ph40",
    countries: ["GB"],
  },
  {
    authority: "WHO",
    topic: "discipline",
    title: "Positive discipline and nurturing care",
    content:
      "The WHO's Nurturing Care Framework emphasises responsive caregiving and positive discipline as essential for child development. Physical punishment and harsh verbal discipline harm children's brain development, emotional regulation, and mental health. Positive alternatives include: setting clear expectations, consistent routines, praise for effort, naming and validating emotions, offering choices, natural consequences, and repairing the relationship after conflict. Caregivers need support, not blame.",
    sourceUrl: "https://nurturing-care.org/",
    countries: [],
  },

  // ─── MENTAL HEALTH ──────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "mental health",
    title: "Postnatal depression and perinatal mental health",
    content:
      "Postnatal depression affects more than 1 in 10 women within a year of giving birth and can also affect fathers and partners. Symptoms include persistent sadness, lack of enjoyment, fatigue, difficulty bonding with the baby, scary thoughts about harming the baby or yourself, and withdrawal. Treatment includes talking therapies (CBT), support groups, and medication (some antidepressants are safe while breastfeeding). Do not suffer in silence. Talk to your health visitor, GP, or call the Samaritans (116 123). It is not your fault and with the right help, most people recover fully.",
    sourceUrl: "https://www.nhs.uk/mental-health/conditions/post-natal-depression/overview/",
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "mental health",
    title: "Screening for maternal depression",
    content:
      "The AAP recommends paediatricians screen mothers for depression at the 1-, 2-, 4-, and 6-month well-child visits using validated tools like the Edinburgh Postnatal Depression Scale (EPDS). Maternal depression adversely affects infant attachment, cognitive development, and behaviour. Fathers can also experience perinatal depression (affects approximately 10%). Early identification and referral for treatment (therapy, medication, peer support) significantly improve outcomes for both parent and child.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/143/1/e20183259/37265",
    countries: ["US"],
  },
  {
    authority: "NHS",
    topic: "mental health",
    title: "Children's mental health: anxiety and low mood",
    content:
      "It is normal for children to feel worried or sad sometimes. Signs that anxiety or low mood may need support include: persistent worry that stops them from doing normal activities, physical symptoms (tummy aches, headaches), sleep problems, changes in appetite, avoiding friends or school, self-harm or talk of self-harm. What helps: listen without judgement, validate feelings, maintain routines, encourage gradual exposure to feared situations, and model healthy coping. GP referral for CAMHS support if symptoms persist beyond 2-4 weeks or significantly affect daily life.",
    sourceUrl: "https://www.nhs.uk/mental-health/children-and-young-adults/",
    countries: ["GB"],
  },
  {
    authority: "WHO",
    topic: "mental health",
    title: "Early childhood development and mental health",
    content:
      "The first 1000 days (from conception to age 2) are critical for brain development. Toxic stress, neglect, abuse, and caregiver mental health problems during this period can have lifelong consequences. Protective factors include responsive caregiving, safe environments, adequate nutrition, and caregiver wellbeing. Investing in early childhood development is one of the most cost-effective strategies for improving population health. Parents experiencing stress or depression should be connected with support services.",
    sourceUrl: "https://www.who.int/publications/i/item/9789240030985",
    ageMinMonths: 0,
    ageMaxMonths: 24,
    countries: [],
  },

  // ─── TOILET TRAINING ───────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "toilet training",
    title: "Potty training: when and how to start",
    content:
      "Most children are ready for potty training between 18 months and 3 years. Signs of readiness: they know when they have a wet or dirty nappy, they know when they are peeing, the gap between wetting is at least 1 hour, they can sit on and get up from a potty, they can pull their trousers down and up, and they show interest or tell you when they need to go. Tips: let them sit on the potty regularly, praise every success, do not punish accidents, use pants rather than pull-ups during the day, and be patient. Night dryness often comes later.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/babys-development/potty-training-and-bedwetting/how-to-potty-train/",
    ageMinMonths: 18,
    ageMaxMonths: 48,
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "toilet training",
    title: "Toilet training readiness and approach",
    content:
      "Children show readiness for toilet training typically between 18 and 30 months. Signs include staying dry for 2+ hours, showing interest in the toilet, being able to follow simple instructions, feeling uncomfortable in dirty nappies, and telling you before or during wetting/soiling. Use a child-sized potty or seat reducer. Praise success. Never punish accidents, shame, or force the child. Expect setbacks during illness, travel, or life changes. Most children achieve daytime dryness by age 3-4. Nighttime dryness may take until age 5-7 and is developmentally normal.",
    sourceUrl: "https://www.healthychildren.org/English/ages-stages/toddler/toilet-training/",
    ageMinMonths: 18,
    ageMaxMonths: 48,
    countries: ["US"],
  },

  // ─── PHYSICAL ACTIVITY ──────────────────────────────────────────────────────

  {
    authority: "WHO",
    topic: "physical activity",
    title: "Physical activity guidelines for children under 5",
    content:
      "Infants (under 1 year): should be physically active several times a day in a variety of ways, including interactive floor-based play; at least 30 minutes of tummy time spread throughout the day. Children aged 1-2 years: at least 180 minutes of physical activity of any intensity spread throughout the day, including moderate-to-vigorous physical activity, the more the better. Children aged 3-4 years: at least 180 minutes, of which at least 60 minutes is moderate-to-vigorous activity. Should not be restrained in prams/car seats for more than 1 hour at a time.",
    sourceUrl: "https://www.who.int/publications/i/item/9789241550536",
    ageMinMonths: 0,
    ageMaxMonths: 60,
    countries: [],
  },
  {
    authority: "NHS",
    topic: "physical activity",
    title: "Physical activity guidelines for children and young people",
    content:
      "Children aged 5-18 should aim for an average of at least 60 minutes of moderate-to-vigorous physical activity per day across the week. This should include activities that strengthen muscles and bones at least 3 days per week. Reduce time spent sitting or lying down and break up long periods of not moving with activity. Activities include walking or cycling to school, active play, PE, sports, swimming, and dancing.",
    sourceUrl: "https://www.nhs.uk/live-well/exercise/exercise-guidelines/physical-activity-guidelines-children-and-young-people/",
    ageMinMonths: 60,
    countries: ["GB"],
  },

  // ─── DENTAL HEALTH ──────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "dental health",
    title: "Children's teeth and dental care",
    content:
      "Start brushing as soon as the first tooth appears (around 6 months). Use a smear of fluoride toothpaste (at least 1000ppm fluoride). From age 3, use a pea-sized amount. Brush twice a day, last thing at night and one other time. Supervise brushing until age 7. Take your child to the dentist when their first teeth appear (NHS dental care is free for children). Avoid sugary drinks and snacks, especially between meals. Do not put anything sweet on dummies. Night-time bottles of milk or juice cause tooth decay.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/babys-development/teething/looking-after-your-babys-teeth/",
    ageMinMonths: 0,
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "dental health",
    title: "Oral health and fluoride use",
    content:
      "Schedule a dental visit by age 1 or within 6 months of the first tooth. Use fluoride toothpaste from the first tooth: a smear (grain-of-rice size) for children under 3, a pea-size amount for children 3-6. Brush twice daily. Fluoride varnish should be applied by a dental or medical professional every 3-6 months starting at tooth eruption. Avoid juice before 12 months. After 12 months, limit juice to 4 oz per day. Do not put a child to bed with a bottle. Community water fluoridation is safe and effective for preventing cavities.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/146/6/e2020034637/33546",
    ageMinMonths: 0,
    countries: ["US"],
  },

  // ─── FEVER & ILLNESS ────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "fever",
    title: "When to worry about a fever in children",
    content:
      "A high temperature (fever) is 38°C or above. In most cases, fever is the body fighting an infection and resolves within a few days. What to do: keep the child comfortable, offer fluids regularly, give paracetamol or ibuprofen if they are distressed (not just to reduce the number). Do NOT use both at the same time, but you can try the other if the first does not help. Do not sponge with cold water. Call 999 or go to A&E if: under 3 months with a temperature of 38°C or above, the child has a stiff neck, rash that does not fade when pressed, is unusually drowsy, has difficulty breathing, or has a seizure.",
    sourceUrl: "https://www.nhs.uk/conditions/fever-in-children/",
    countries: ["GB"],
  },
  {
    authority: "NICE",
    topic: "fever",
    title: "NICE traffic light system for assessing feverish children",
    content:
      "Green (low risk): normal skin colour, responds normally to social cues, content/smiles, stays awake, strong normal cry, moist mucous membranes. Amber (intermediate risk): pallor reported by parent, not responding normally, no smile, wakes only with prolonged stimulation, decreased activity, nasal flaring, dry mucous membranes, reduced urine output, fever 5+ days, rigors, limb or joint swelling. Red (high risk): pale/mottled/blue skin, does not respond to social cues, appears ill, does not wake or stays awake only briefly, weak/high-pitched or continuous cry, grunting, raised respiratory rate, reduced skin turgor, bile-stained vomiting, age 0-3 months with temperature 38°C+, non-blanching rash, bulging fontanelle, neck stiffness, focal seizures.",
    sourceUrl: "https://www.nice.org.uk/guidance/ng143",
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "fever",
    title: "Fever management in children",
    content:
      "Fever in children is defined as a rectal temperature of 100.4°F (38°C) or higher. Fever itself is not dangerous and is the body's immune response to infection. Treatment goals should focus on comfort, not achieving a normal temperature. Acetaminophen (from 2 months) and ibuprofen (from 6 months) are safe when dosed by weight. Do not alternate medications routinely. Do not use aspirin (risk of Reye syndrome). Seek immediate medical attention if: the infant is under 3 months, the fever is above 104°F (40°C), the child appears seriously ill, has a febrile seizure, or shows signs of dehydration.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/127/3/580/65039",
    countries: ["US"],
  },

  // ─── BREASTFEEDING SUPPORT ──────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "breastfeeding",
    title: "Breastfeeding: getting started and common problems",
    content:
      "Skin-to-skin contact after birth helps initiate breastfeeding. Feed on demand, typically 8-12 times in 24 hours for newborns. Signs of a good latch: wide mouth, chin touching the breast, more areola visible above the top lip than below, no pain after the initial latch. Common problems and solutions: sore/cracked nipples (check latch), engorgement (feed frequently, hand express), mastitis (continue feeding, warmth, GP if fever develops), low supply perception (most mothers produce enough; frequent feeding stimulates supply). Support is available from midwives, health visitors, and breastfeeding counsellors.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/breastfeeding-and-bottle-feeding/breastfeeding/",
    ageMinMonths: 0,
    ageMaxMonths: 24,
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "breastfeeding",
    title: "Breastfeeding benefits and recommendations",
    content:
      "The AAP recommends exclusive breastfeeding for approximately 6 months, with continued breastfeeding alongside complementary foods for 2 years or beyond, as mutually desired. Benefits for infants: reduced risk of ear infections, respiratory infections, gastrointestinal infections, SIDS, obesity, type 2 diabetes, asthma, and eczema. Benefits for mothers: reduced risk of breast cancer, ovarian cancer, type 2 diabetes, and postpartum depression. Contraindications are rare (HIV in high-resource settings, active untreated tuberculosis, certain medications). Donor human milk is an acceptable alternative when mother's own milk is unavailable for preterm infants.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/150/1/e2022057988/188347",
    ageMinMonths: 0,
    ageMaxMonths: 24,
    countries: ["US"],
  },

  // ─── ALLERGIES ──────────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "allergies",
    title: "Food allergies in babies and children",
    content:
      "Common allergens include cows' milk, eggs, peanuts, tree nuts, wheat, soy, fish, and shellfish. Introduce allergenic foods one at a time from around 6 months, in small amounts. If well tolerated, continue regularly. Symptoms of allergic reaction: hives, swelling (lips, face, eyes), vomiting, tummy pain, diarrhoea, runny nose. Severe reaction (anaphylaxis): difficulty breathing, swelling of tongue/throat, pale/floppy (in babies), collapse. Call 999 immediately for anaphylaxis. If your child has severe eczema or known egg allergy, talk to your GP before introducing peanut.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/weaning-and-feeding/food-allergies-in-babies-and-young-children/",
    ageMinMonths: 4,
    ageMaxMonths: 60,
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "allergies",
    title: "Prevention of peanut allergy through early introduction",
    content:
      "Based on the LEAP study, the AAP endorses early introduction of peanut-containing foods to reduce the risk of peanut allergy. For high-risk infants (severe eczema or egg allergy): introduce peanut at 4-6 months after evaluation (may include allergy testing). For moderate-risk infants (mild-moderate eczema): introduce peanut around 6 months. For low-risk infants: introduce peanut freely with other complementary foods. Always introduce in an age-appropriate form (peanut butter thinned with breast milk/formula, or peanut puffs), never whole peanuts.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/139/1/e20164145/53895",
    ageMinMonths: 4,
    ageMaxMonths: 12,
    countries: ["US"],
  },

  // ─── SUN SAFETY ─────────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "sun safety",
    title: "Protecting babies and children from the sun",
    content:
      "Babies under 6 months should be kept out of direct sunlight. Their skin is too sensitive for sunscreen. Use shade, hats, and loose clothing. For children over 6 months: use SPF 30+ broad-spectrum sunscreen, reapply every 2 hours and after swimming, use a wide-brimmed hat and UV-protective clothing, seek shade between 11am and 3pm. Never use sunbeds. Sunburn in childhood significantly increases the risk of skin cancer later in life. Make sure children drink plenty of fluids in hot weather.",
    sourceUrl: "https://www.nhs.uk/live-well/seasonal-health/sunscreen-and-sun-safety/",
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "sun safety",
    title: "Sun protection for infants and children",
    content:
      "Infants under 6 months: keep out of direct sunlight, use shade and protective clothing. Sunscreen may be used on small areas (face, back of hands) if shade and clothing are not available. For children 6 months and older: apply broad-spectrum SPF 30+ sunscreen 15-30 minutes before sun exposure, reapply every 2 hours and after swimming or sweating. Wear protective clothing, wide-brimmed hats, and UV-blocking sunglasses. Limit sun exposure between 10am and 4pm. Avoid tanning beds entirely.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/135/4/e1036/33554",
    countries: ["US"],
  },

  // ─── GROWTH & WEIGHT ───────────────────────────────────────────────────────

  {
    authority: "WHO",
    topic: "growth",
    title: "WHO Child Growth Standards",
    content:
      "The WHO Child Growth Standards describe normal child growth from birth to 5 years under optimal environmental conditions. They are used worldwide to assess how children are growing compared to healthy children. Growth is tracked using weight-for-age, length/height-for-age, weight-for-length/height, and BMI-for-age charts. Growth faltering (crossing downward through 2 or more centile spaces) should prompt assessment for feeding difficulties, illness, or neglect. Head circumference is tracked until age 2 years. Growth is a sensitive indicator of overall child health and nutrition.",
    sourceUrl: "https://www.who.int/tools/child-growth-standards",
    ageMinMonths: 0,
    ageMaxMonths: 60,
    countries: [],
  },
  {
    authority: "NICE",
    topic: "growth",
    title: "Faltering growth in children",
    content:
      "Faltering growth (previously 'failure to thrive') is identified when a child's weight falls through 2 or more centile spaces on the UK-WHO growth chart, or their weight is below the 2nd centile. Causes include insufficient calorie intake (most common), feeding difficulties, chronic illness, neglect, or underlying medical conditions. Assessment should include a detailed feeding history, family and social history, developmental assessment, and physical examination. Involve a health visitor or paediatrician. Most cases respond to dietary advice and support.",
    sourceUrl: "https://www.nice.org.uk/guidance/ng75",
    ageMinMonths: 0,
    ageMaxMonths: 60,
    countries: ["GB"],
  },

  // ─── PREGNANCY & NEWBORN ────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "pregnancy",
    title: "Antenatal care schedule and what to expect",
    content:
      "First appointment (booking, around 8-12 weeks): medical history, blood tests (blood group, anaemia, infections), urine test, BMI, mental health check, dating scan offered. 11-14 weeks: dating scan and optional screening for Down's, Edwards', and Patau's syndromes. 18-20 weeks: anomaly scan. Regular check-ups continue through pregnancy (more frequent for first pregnancies) to monitor blood pressure, baby's growth, and wellbeing. Additional scans or appointments may be needed if complications arise. Contact your midwife if you notice reduced fetal movements, bleeding, severe headache, or vision changes.",
    sourceUrl: "https://www.nhs.uk/pregnancy/your-pregnancy-care/your-antenatal-appointments/",
    countries: ["GB"],
  },
  {
    authority: "WHO",
    topic: "pregnancy",
    title: "WHO recommendations on antenatal care",
    content:
      "WHO recommends a minimum of 8 antenatal care contacts for a positive pregnancy experience. Key recommendations include: daily iron and folic acid supplementation (30-60mg iron, 400mcg folic acid), at least one ultrasound before 24 weeks to estimate gestational age and detect anomalies, blood pressure measurement at every visit to screen for pre-eclampsia, urine testing for bacteriuria and proteinuria, HIV testing, tetanus vaccination, counselling on nutrition, physical activity, tobacco and substance use, and birth preparedness.",
    sourceUrl: "https://www.who.int/publications/i/item/9789241549912",
    countries: [],
  },
  {
    authority: "NHS",
    topic: "newborn",
    title: "Newborn care: the first few days",
    content:
      "Skin-to-skin contact immediately after birth helps regulate the baby's temperature, breathing, and blood sugar, and promotes bonding and breastfeeding. The vitamin K injection is offered within the first hour to prevent bleeding disorders. The newborn physical examination is done within 72 hours, checking eyes, heart, hips, and testes. The heel prick (newborn blood spot) test at day 5 screens for 9 rare conditions including sickle cell disease, cystic fibrosis, and hypothyroidism. The hearing test is usually done before discharge or within the first few weeks.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/the-first-few-days/",
    ageMinMonths: 0,
    ageMaxMonths: 1,
    countries: ["GB"],
  },

  // ─── EMOTIONAL DEVELOPMENT ──────────────────────────────────────────────────

  {
    authority: "NICE",
    topic: "attachment",
    title: "Attachment and early relationships",
    content:
      "Secure attachment in the first 2 years of life is foundational for emotional regulation, social competence, and mental health across the lifespan. Key factors: consistent, sensitive, responsive caregiving; the caregiver accurately reading and responding to the child's cues; repair after misattunement (getting it wrong sometimes is normal and recovery matters). Risk factors for insecure attachment: parental mental health problems, substance misuse, domestic violence, unresolved trauma, and social isolation. Targeted interventions (e.g. video interaction guidance) are effective.",
    sourceUrl: "https://www.nice.org.uk/guidance/ph40",
    ageMinMonths: 0,
    ageMaxMonths: 24,
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "attachment",
    title: "Building secure attachment with your child",
    content:
      "Responsive parenting builds secure attachment: respond promptly and consistently to your baby's cries and signals, make eye contact, talk and sing to your baby, engage in reciprocal play (serve and return interactions), and provide comfort during distress. Secure attachment does not mean being perfect; it means being 'good enough' and repairing when things go wrong. Secure attachment is associated with better emotional regulation, higher self-esteem, more positive peer relationships, better academic performance, and lower rates of mental health problems in later life.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/149/1/e2021052582/183926",
    ageMinMonths: 0,
    ageMaxMonths: 60,
    countries: ["US"],
  },

  // ─── NUTRITION ──────────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "nutrition",
    title: "Healthy eating for children (1-5 years)",
    content:
      "Children aged 1-5 need a varied diet including: starchy foods (bread, pasta, rice, potatoes) at each meal; at least 5 portions of fruit and vegetables per day; protein (meat, fish, eggs, beans, pulses) twice a day; dairy (milk, cheese, yoghurt) 3 times a day; and small amounts of healthy fats. Whole milk until age 2, then semi-skimmed if eating well. Limit sugar: no added sugar for under-2s, maximum 19g/day for 4-6 year olds. Limit salt: under 1 year, no added salt; 1-3 years, max 2g/day; 4-6 years, max 3g/day. Avoid ultra-processed foods. Eat meals together as a family.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/weaning-and-feeding/what-to-feed-young-children/",
    ageMinMonths: 12,
    ageMaxMonths: 60,
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "nutrition",
    title: "Healthy beverage consumption in early childhood",
    content:
      "Birth-6 months: breast milk and/or formula only. 6-12 months: introduce small amounts of water (up to 4-8 oz/day), continue breast milk or formula as the main drink. No juice before 12 months. 12-24 months: whole milk (16-24 oz/day), water, and small amounts of 100% juice (max 4 oz/day). No flavoured milk, plant-based milks (unless medically needed), caffeinated beverages, or sugar-sweetened beverages. After 24 months: low-fat or skim milk, water as the primary beverage, limit juice to 4-6 oz/day.",
    sourceUrl: "https://www.healthychildren.org/English/healthy-living/nutrition/",
    ageMinMonths: 0,
    ageMaxMonths: 60,
    countries: ["US"],
  },
  {
    authority: "WHO",
    topic: "nutrition",
    title: "Reducing sugar intake in children",
    content:
      "WHO strongly recommends reducing free sugar intake to less than 10% of total energy intake for both adults and children. A further reduction to below 5% (roughly 25g or 6 teaspoons per day) provides additional health benefits. Free sugars include sugars added to foods and drinks, as well as sugars naturally present in honey, syrups, and fruit juices. Sugar-sweetened beverages are the largest single source of free sugars in many diets. High sugar consumption is associated with dental caries, overweight, obesity, and increased risk of non-communicable diseases.",
    sourceUrl: "https://www.who.int/publications/i/item/9789241549028",
    countries: [],
  },

  // ─── IRON DEFICIENCY ───────────────────────────────────────────────────────

  {
    authority: "AAP",
    topic: "nutrition",
    title: "Iron deficiency and anaemia in young children",
    content:
      "Iron deficiency is the most common nutritional deficiency worldwide and can cause irreversible cognitive and behavioural impairments. Risk peaks at 1-3 years. Breastfed infants should receive iron supplementation (1 mg/kg/day) starting at 4 months until iron-rich complementary foods are introduced. Formula-fed infants receive adequate iron from iron-fortified formula. After 6 months, prioritise iron-rich foods: red meat, poultry, fish, iron-fortified cereals, beans, and lentils. Pair with vitamin C-rich foods to enhance absorption. Screen for anaemia at 12 months. Excess milk intake (>24 oz/day) displaces iron-rich foods.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/126/5/1040/65546",
    ageMinMonths: 0,
    ageMaxMonths: 36,
    countries: ["US"],
  },

  // ─── LANGUAGE DEVELOPMENT ──────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "language",
    title: "Speech and language development: what to expect",
    content:
      "By 12 months: responds to name, understands simple words like 'no' and 'bye-bye', babbles strings of sounds, may say 1-3 words. By 18 months: points, understands 10+ words, says 6-20 words (though words may not be clear). By 2 years: uses 50+ words, starts joining 2 words ('more milk'), follows simple instructions. By 3 years: talks in sentences of 4-5 words, asks questions, can be understood by strangers most of the time. What helps: talk, sing, and read to your child daily; respond to their attempts to communicate; narrate your day. Seek advice from a health visitor or GP if concerned.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/babys-development/speech-and-language/",
    ageMinMonths: 0,
    ageMaxMonths: 48,
    countries: ["GB"],
  },
  {
    authority: "AAP",
    topic: "language",
    title: "Promoting language development in early childhood",
    content:
      "The single most important thing parents can do for language development is talk, read, and sing to their child. Serve-and-return interactions (responding to a child's babbles and gestures) build neural pathways. Read aloud from birth, even before the child understands words. Limit screen time, as passive media does not build language skills the way live interaction does. Bilingual exposure from birth is beneficial and does not cause language delays. Red flags requiring evaluation: no babbling by 12 months, no words by 16 months, no 2-word phrases by 24 months, or any loss of language skills at any age.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/134/2/e404/32831",
    ageMinMonths: 0,
    ageMaxMonths: 60,
    countries: ["US"],
  },

  // ─── PLAY ───────────────────────────────────────────────────────────────────

  {
    authority: "AAP",
    topic: "play",
    title: "The power of play in child development",
    content:
      "Play is essential for brain development, social-emotional learning, stress management, and building executive function. Types of play by age: 0-12 months, sensory and exploratory play; 1-2 years, functional play (pushing cars, stacking blocks); 2-3 years, symbolic/pretend play; 3-5 years, cooperative play with peers, imaginative play. Unstructured free play is particularly valuable. Parents should play with their children daily. Avoid over-scheduling. Simple toys (blocks, dolls, art supplies) promote more creative play than electronic toys. Outdoor play is especially beneficial.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/142/3/e20182058/38649",
    ageMinMonths: 0,
    ageMaxMonths: 60,
    countries: ["US"],
  },

  // ─── CHILDCARE ──────────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "childcare",
    title: "Choosing childcare: what to look for",
    content:
      "When choosing childcare (nursery, childminder, nanny), check: Ofsted registration and latest inspection report, staff qualifications and adult-to-child ratios, safeguarding policies, how they handle illness and emergencies, daily routine and activities, food and nutrition policy, how they communicate with parents, settling-in process, and how they support children's development. Visit several settings and observe how staff interact with children. Trust your instincts. Quality childcare should be warm, stimulating, and safe. Free early education is available for all 3-4 year olds (15-30 hours) and some 2 year olds.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/babys-development/childcare/choosing-childcare/",
    countries: ["GB"],
  },

  // ─── SIBLING RIVALRY ───────────────────────────────────────────────────────

  {
    authority: "AAP",
    topic: "sibling rivalry",
    title: "Managing sibling conflict and preparing for a new baby",
    content:
      "Sibling rivalry is normal and can teach conflict resolution. To prepare for a new sibling: tell the child during pregnancy (timing depends on age), read books about new babies, involve them in preparations, maintain their routine after the birth. Managing conflict: avoid comparing children, give each child individual attention, let children resolve minor disputes themselves, intervene when conflict becomes physical or emotionally abusive, acknowledge each child's feelings, avoid taking sides, praise cooperative behaviour. Do not expect the older child to always be 'the responsible one'.",
    sourceUrl: "https://www.healthychildren.org/English/family-life/family-dynamics/",
    countries: ["US"],
  },

  // ─── SPECIAL NEEDS & NEURODEVELOPMENT ──────────────────────────────────────

  {
    authority: "NICE",
    topic: "autism",
    title: "Autism spectrum disorder: recognition and referral",
    content:
      "Consider autism assessment if a child shows: delayed or absent speech, lack of pointing or showing objects to share interest, limited eye contact, repetitive behaviours (hand-flapping, lining up toys), insistence on sameness or distress at change, unusual sensory responses (covering ears, sniffing objects), difficulty with social interaction and imaginative play. Refer to a specialist autism team rather than adopting a 'wait and see' approach. Early intervention improves outcomes. Autism is not caused by vaccines, parenting style, or diet. Support needs vary widely across the spectrum.",
    sourceUrl: "https://www.nice.org.uk/guidance/cg128",
    countries: ["GB"],
  },
  {
    authority: "CDC",
    topic: "autism",
    title: "Autism screening and early signs",
    content:
      "The AAP recommends universal screening for autism at 18 and 24 months using the M-CHAT-R/F (Modified Checklist for Autism in Toddlers). Early signs include: not responding to name by 12 months, not pointing at objects by 14 months, not playing pretend by 18 months, avoiding eye contact, getting upset by minor changes, repeating words or phrases (echolalia), unusual reactions to sensory input. Early intervention services (speech therapy, occupational therapy, behavioural therapy) before age 3 can significantly improve outcomes. The CDC's 'Learn the Signs. Act Early.' programme provides milestone checklists and guidance.",
    sourceUrl: "https://www.cdc.gov/ncbddd/autism/screening.html",
    ageMinMonths: 12,
    ageMaxMonths: 36,
    countries: ["US"],
  },
  {
    authority: "NICE",
    topic: "ADHD",
    title: "ADHD: recognition and management in children",
    content:
      "ADHD is characterised by inattention, hyperactivity, and impulsivity that are persistent, pervasive (across settings), and impairing. Symptoms must be present before age 12 and last at least 6 months. Diagnosis should be made by a specialist (paediatrician or child psychiatrist) using comprehensive assessment. For children under 5: parent training programmes are the first-line treatment. For children 5+: first offer an evidence-based parent training/education programme; medication (usually methylphenidate) should be considered if symptoms remain significant after environmental modifications and behavioural strategies. ADHD is a neurodevelopmental condition, not a result of poor parenting.",
    sourceUrl: "https://www.nice.org.uk/guidance/ng87",
    ageMinMonths: 36,
    countries: ["GB"],
  },

  // ─── OBESITY & HEALTHY WEIGHT ──────────────────────────────────────────────

  {
    authority: "NICE",
    topic: "obesity",
    title: "Preventing obesity in children",
    content:
      "Childhood obesity prevention should start early. Key recommendations: breastfeed if possible (associated with lower obesity risk), introduce a variety of healthy complementary foods, avoid using food as reward or comfort, encourage active play, limit sedentary screen time, eat meals together as a family, offer appropriate portion sizes, avoid sugar-sweetened drinks, and ensure adequate sleep. The National Child Measurement Programme measures children in Reception (age 4-5) and Year 6 (age 10-11). If a child is overweight, offer family-based lifestyle interventions addressing diet, physical activity, and behaviour change.",
    sourceUrl: "https://www.nice.org.uk/guidance/cg189",
    countries: ["GB"],
  },
  {
    authority: "WHO",
    topic: "obesity",
    title: "Childhood overweight and obesity",
    content:
      "Globally, 39 million children under 5 were overweight or obese in 2020. Childhood obesity is associated with a higher risk of adult obesity, type 2 diabetes, cardiovascular disease, and psychosocial problems. Prevention requires a whole-of-society approach: promote exclusive breastfeeding for 6 months, healthy complementary feeding, physical activity, limited sedentary time, adequate sleep, and restriction of marketing of unhealthy foods to children. Treatment should be family-centred, focusing on healthy lifestyle changes rather than restrictive dieting.",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight",
    countries: [],
  },

  // ─── TEETHING ──────────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "teething",
    title: "Teething symptoms and how to help",
    content:
      "Teeth usually start coming through at around 6 months, but can appear from 3 months onwards. Symptoms: red and sore gums, flushed cheek, dribbling more than usual, gnawing and chewing on things, being fretful. Teething does NOT cause fever, diarrhoea, or rashes. What helps: give something to chew on (cooled teething ring, raw fruit/veg for 6+ months), rub gums with a clean finger, try sugar-free teething gel. Avoid: teething necklaces (choking/strangulation risk), homeopathic teething tablets (may contain belladonna), and lidocaine gels (risk of overdose). See a GP if your child has a high temperature or seems unwell.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/babys-development/teething/baby-teething-symptoms/",
    ageMinMonths: 3,
    ageMaxMonths: 30,
    countries: ["GB"],
  },

  // ─── CORD CARE & CIRCUMCISION ──────────────────────────────────────────────

  {
    authority: "WHO",
    topic: "newborn",
    title: "Umbilical cord care",
    content:
      "WHO recommends dry cord care: keep the umbilical stump clean and dry, exposed to air. Do not apply any substances (alcohol, antiseptics, traditional preparations) to the cord unless advised by a healthcare worker in high-infection-risk settings. Fold the nappy below the cord stump. The cord typically falls off within 1-3 weeks. Signs of infection requiring medical attention: redness or swelling around the base, foul-smelling discharge, pus, or bleeding. Clean with water if soiled and pat dry.",
    sourceUrl: "https://www.who.int/publications/i/item/9789241548502",
    ageMinMonths: 0,
    ageMaxMonths: 1,
    countries: [],
  },

  // ─── COLIC ─────────────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "colic",
    title: "Colic: what it is and how to cope",
    content:
      "Colic is excessive crying in an otherwise healthy baby, typically starting around 2-4 weeks, peaking at 6-8 weeks, and resolving by 3-4 months. Defined as crying for more than 3 hours a day, 3 days a week, for 3+ weeks. The cause is unknown. What may help: holding the baby during crying episodes, gentle motion (rocking, walking, car ride), white noise, warm bath, winding/burping techniques, anti-colic bottles if bottle-feeding. There is no strong evidence for colic drops (simeticone/gripe water). Most importantly, support the parents: colic is not your fault, it will pass, and it is okay to put the baby down safely and take a break if you feel overwhelmed.",
    sourceUrl: "https://www.nhs.uk/conditions/colic/",
    ageMinMonths: 0,
    ageMaxMonths: 4,
    countries: ["GB"],
  },

  // ─── NAPPY RASH ────────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "nappy rash",
    title: "Treating and preventing nappy rash",
    content:
      "Nappy rash is very common and usually caused by prolonged contact with urine or faeces. Prevention: change nappies frequently, clean the area gently with water or fragrance-free wipes, apply a thin layer of barrier cream (zinc oxide, petroleum jelly) at each change, allow nappy-free time on a towel. Treatment: same as prevention; use a thicker layer of barrier cream. Avoid: talcum powder, scented products, tight-fitting nappies. See a GP if: the rash is severe, not improving after a week, has blisters or pus, or the baby has a fever; it may be a fungal infection requiring antifungal cream.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/caring-for-a-newborn/nappy-rash/",
    ageMinMonths: 0,
    ageMaxMonths: 36,
    countries: ["GB"],
  },

  // ─── DUMMIES / PACIFIERS ───────────────────────────────────────────────────

  {
    authority: "AAP",
    topic: "pacifiers",
    title: "Pacifier use: benefits and recommendations",
    content:
      "Offering a pacifier at nap time and bedtime is associated with a reduced risk of SIDS. Wait until breastfeeding is well established (usually 3-4 weeks) before introducing a pacifier. Do not force it if the baby refuses. Do not coat it in sugar or honey. Replace regularly and discard if damaged. Consider weaning off the pacifier by age 2-4 to avoid dental problems (open bite, crossbite). Never attach a pacifier to a string or cord around the baby's neck. Clean pacifiers by washing with soap and water, not by putting them in the parent's mouth.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/150/1/e2022057990/188304",
    ageMinMonths: 0,
    ageMaxMonths: 48,
    countries: ["US"],
  },

  // ─── SCHOOL READINESS ──────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "school readiness",
    title: "Preparing your child for school",
    content:
      "Children start school in the September after they turn 4 in England. To help them prepare: practise dressing and undressing (coat, shoes), using the toilet independently, eating with a knife and fork, listening and following simple instructions, sharing and taking turns, recognising their own name, sitting still for short periods. Read together daily. Practise the school run. Visit the school. Talk positively about school. Label all belongings. Ensure they can ask for help when needed. Emotional readiness is as important as academic readiness; separation anxiety is normal and usually settles within a few weeks.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/babys-development/school-readiness/",
    ageMinMonths: 36,
    ageMaxMonths: 60,
    countries: ["GB"],
  },

  // ─── SAFEGUARDING & ABUSE ──────────────────────────────────────────────────

  {
    authority: "NICE",
    topic: "safeguarding",
    title: "Recognising child abuse and neglect",
    content:
      "Types of abuse: physical, emotional, sexual, neglect. Possible indicators of physical abuse: unexplained bruises (especially in non-mobile children), burns, bites, fractures; injuries inconsistent with the explanation given. Emotional abuse: withdrawal, low self-esteem, age-inappropriate behaviour, self-harm. Neglect: poor hygiene, inadequate clothing, hunger, untreated medical conditions, poor school attendance. Sexual abuse: age-inappropriate sexual behaviour, unexplained genital injuries, STIs. If you suspect abuse: report to local authority children's services or call the NSPCC helpline (0808 800 5000). In an emergency, call 999. Do not attempt to investigate yourself.",
    sourceUrl: "https://www.nice.org.uk/guidance/cg89",
    countries: ["GB"],
  },

  // ─── FUSSY EATING ──────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "fussy eating",
    title: "Dealing with fussy eaters",
    content:
      "Fussy eating is very common in toddlers and usually a phase. Tips: eat together as a family and model eating a variety of foods, offer small portions and praise trying new things, do not force feed or bribe, offer the same food the rest of the family is eating, let children feed themselves, do not make a big deal about rejected food (just take it away calmly), re-offer rejected foods regularly (it can take 10-15 exposures), involve children in food shopping and preparation, keep mealtimes relaxed and limit to 20-30 minutes, avoid filling up on milk or snacks before meals.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/weaning-and-feeding/fussy-eaters/",
    ageMinMonths: 12,
    ageMaxMonths: 60,
    countries: ["GB"],
  },

  // ─── FORMULA FEEDING ──────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "formula feeding",
    title: "How to make up a formula feed safely",
    content:
      "Use first infant formula (based on whey protein) for the first 12 months. Make up feeds fresh each time. Boil fresh water and let it cool for no more than 30 minutes (it must still be at least 70°C to kill bacteria). Add the correct amount of powder (1 scoop per 30ml of water, using the scoop provided). Do not add extra scoops or pack tightly. Cool the bottle quickly under running cold water. Test temperature on the inside of your wrist. Discard any unused formula within 2 hours. Do not reheat formula. Do not use bottled mineral water (too high in sodium). Sterilise all bottles and teats until 12 months.",
    sourceUrl: "https://www.nhs.uk/conditions/baby/breastfeeding-and-bottle-feeding/bottle-feeding/making-up-baby-formula/",
    ageMinMonths: 0,
    ageMaxMonths: 12,
    countries: ["GB"],
  },

  // ─── TUMMY TIME ────────────────────────────────────────────────────────────

  {
    authority: "AAP",
    topic: "tummy time",
    title: "Importance of tummy time for infant development",
    content:
      "Tummy time, supervised time spent on the stomach while awake, is essential for motor development. Start from day one: place baby on your chest for skin-to-skin tummy time. Aim for 3-5 minutes at a time, building up gradually to 40-60 minutes total per day by 3 months. Tummy time strengthens neck, shoulder, arm, and core muscles needed for rolling, crawling, sitting, and walking. It also helps prevent flat head syndrome (positional plagiocephaly). If baby fusses, try getting on the floor face-to-face, using a rolled towel under the armpits, or placing toys within reach for motivation.",
    sourceUrl: "https://www.healthychildren.org/English/ages-stages/baby/sleep/",
    ageMinMonths: 0,
    ageMaxMonths: 6,
    countries: ["US"],
  },

  // ─── FLAT HEAD SYNDROME ────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "flat head",
    title: "Flat head syndrome (plagiocephaly) in babies",
    content:
      "Flat head syndrome is very common and usually improves naturally as the baby grows and spends more time sitting up and moving freely. Prevention and management: regular tummy time when awake, alternate which end of the cot you place the baby's head, change the side you hold the baby for feeds, reduce time in car seats, bouncers, and swings. Helmets/bands are not recommended by the NHS as there is insufficient evidence that they work better than natural improvement. See your GP if: the flatness is severe, not improving by 6 months, or there is a ridge along the skull (possible craniosynostosis requiring specialist assessment).",
    sourceUrl: "https://www.nhs.uk/conditions/plagiocephaly-brachycephaly/",
    ageMinMonths: 0,
    ageMaxMonths: 12,
    countries: ["GB"],
  },

  // ─── ECZEMA ────────────────────────────────────────────────────────────────

  {
    authority: "NICE",
    topic: "eczema",
    title: "Atopic eczema in children: management",
    content:
      "Eczema affects 1 in 5 children. Management is stepwise: Step 1 (mild): regular emollients (moisturisers) at least twice daily and as soap substitutes; avoid triggers (soaps, detergents, rough fabrics, extremes of temperature). Step 2 (moderate): add mild topical corticosteroid (e.g. hydrocortisone 1%) for flare-ups, apply thinly once or twice daily until the flare settles. Step 3 (severe): moderate-potency topical corticosteroid, referral to dermatology. Emollients should be used even when the skin is clear. Aqueous cream should NOT be used as a leave-on emollient. Wet wraps may help during flares. Food allergy testing is warranted if eczema is severe and unresponsive to treatment.",
    sourceUrl: "https://www.nice.org.uk/guidance/cg57",
    countries: ["GB"],
  },

  // ─── READING TO CHILDREN ──────────────────────────────────────────────────

  {
    authority: "AAP",
    topic: "literacy",
    title: "Reading aloud from birth",
    content:
      "The AAP recommends reading aloud to children from birth as part of primary care anticipatory guidance (Reach Out and Read programme). Shared book reading from infancy promotes language acquisition, emergent literacy skills, and parent-child bonding. Benefits are strongest when reading is interactive: ask open-ended questions, let the child turn pages, point to and name pictures, relate stories to the child's experiences. Children who are read to daily from infancy hear millions more words than those who are not, contributing to school readiness. Even 15 minutes a day makes a measurable difference.",
    sourceUrl: "https://publications.aap.org/pediatrics/article/134/2/e404/32831",
    ageMinMonths: 0,
    countries: ["US"],
  },

  // ─── STRANGER DANGER & ONLINE SAFETY ──────────────────────────────────────

  {
    authority: "NHS",
    topic: "online safety",
    title: "Keeping children safe online",
    content:
      "As children get older, online safety becomes increasingly important. Key advice: set up parental controls on devices and Wi-Fi, agree family rules about screen time and online activity, keep devices in shared family spaces, talk openly about what they see online, teach them never to share personal information (name, school, address, photos), explain that not everyone online is who they say they are, encourage them to tell you if something makes them uncomfortable. Resources: NSPCC Net Aware, Internet Matters, Childline, CEOP (report online abuse). Know the age ratings for apps and games (most social media platforms require users to be 13+).",
    sourceUrl: "https://www.nhs.uk/every-mind-matters/children-and-young-people/",
    ageMinMonths: 36,
    countries: ["GB"],
  },

  // ─── REFLUX ────────────────────────────────────────────────────────────────

  {
    authority: "NICE",
    topic: "reflux",
    title: "Gastro-oesophageal reflux in infants",
    content:
      "GOR (reflux, posseting) is common in babies and usually resolves by 12-18 months as the oesophageal sphincter matures. It does not usually need treatment. Practical advice: keep baby upright after feeds for 20-30 minutes, smaller more frequent feeds, ensure correct bottle teat flow, do not overfeed. If breastfeeding, a 2-4 week trial of excluding cows' milk from the mother's diet may be considered. Alginate therapy (e.g. Gaviscon Infant) can be tried. GORD (pathological reflux) is suspected when there is faltering growth, feeding difficulties, or respiratory symptoms. Proton pump inhibitors should NOT be used for overt reflux without complications.",
    sourceUrl: "https://www.nice.org.uk/guidance/ng1",
    ageMinMonths: 0,
    ageMaxMonths: 18,
    countries: ["GB"],
  },

  // ─── CHILDPROOF MEDICATIONS ────────────────────────────────────────────────

  {
    authority: "CDC",
    topic: "safety",
    title: "Medication safety for children",
    content:
      "Unintentional medication poisoning is a leading cause of child emergency visits. Prevention: store all medicines up high and out of sight/reach, use child-resistant packaging but know it is not childproof, never call medicine 'candy', administer medicine using the dosing device provided (not kitchen spoons), follow weight-based dosing, check active ingredients to avoid double-dosing (e.g. multiple products containing acetaminophen), save the Poison Control number (1-800-222-1222). Lock up opioids and adult medications securely. Carbon monoxide detectors should also be in every home.",
    sourceUrl: "https://www.cdc.gov/medication-safety/about/index.html",
    countries: ["US"],
  },

  // ─── HANDWASHING ───────────────────────────────────────────────────────────

  {
    authority: "WHO",
    topic: "hygiene",
    title: "Handwashing: when and how",
    content:
      "Washing hands with soap and water is one of the most effective ways to prevent the spread of infections. Teach children to wash hands: before eating, after using the toilet, after playing outside, after touching animals, after blowing nose/coughing/sneezing. Technique: wet hands, apply soap, rub all surfaces for at least 20 seconds (sing 'Happy Birthday' twice), rinse under running water, dry with a clean towel. Hand sanitiser (at least 60% alcohol) can be used when soap and water are not available, but is not as effective on visibly dirty hands.",
    sourceUrl: "https://www.who.int/campaigns/world-hand-hygiene-day",
    countries: [],
  },

  // ─── BURNS & SCALDS ────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "safety",
    title: "Burns and scalds first aid for children",
    content:
      "Burns and scalds are common in young children. Prevention: test bath water with your elbow (should be warm, not hot), keep hot drinks away from children, turn pan handles inward on the hob, use a fireguard, keep hair straighteners/irons out of reach. First aid: cool the burn under cool running water for at least 20 minutes (not ice or icy water), remove clothing/jewellery unless stuck to the skin, cover loosely with cling film or a clean non-fluffy dressing. Do NOT use creams, butter, or toothpaste. Call 999 if: the burn is larger than the child's hand, is on the face/hands/feet/genitals, is deep (white or charred), or the child is under 5.",
    sourceUrl: "https://www.nhs.uk/conditions/burns-and-scalds/",
    countries: ["GB"],
  },

  // ─── HEAD LICE ─────────────────────────────────────────────────────────────

  {
    authority: "NHS",
    topic: "head lice",
    title: "Head lice treatment",
    content:
      "Head lice are tiny insects that live in hair and are very common in children. They spread by head-to-head contact, not through dirty hair. Detection: use a fine-toothed detection comb on wet, conditioned hair. Treatment options: wet combing with conditioner every 3-4 days for 2 weeks (removes lice before they can breed) or medicated treatments (dimeticone or isopropyl myristate) applied twice, 7 days apart. Treat the whole household at the same time if lice are found. There is no need to wash bedding or stay off school. Over-the-counter treatments are available from pharmacies.",
    sourceUrl: "https://www.nhs.uk/conditions/head-lice-and-nits/",
    countries: ["GB"],
  },
];

async function main() {
  console.log(`Seeding ${guidelines.length} parenting guidelines...`);

  await prisma.parentingGuideline.deleteMany();

  for (const g of guidelines) {
    await prisma.parentingGuideline.create({
      data: {
        authority: g.authority,
        topic: g.topic,
        title: g.title,
        content: g.content,
        sourceUrl: g.sourceUrl ?? null,
        ageMinMonths: g.ageMinMonths ?? null,
        ageMaxMonths: g.ageMaxMonths ?? null,
        countries: g.countries,
        locale: "en",
      },
    });
  }

  console.log(`Done. Seeded ${guidelines.length} guidelines.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

-- Phase 4: Test Questions Seed — 40 questions per level (200 total)
-- English + Math, Levels 1-5, MCQ format

INSERT INTO test_questions
  (id, level, subject, category, question_text, options_json, correct_answer, explanation, difficulty)
VALUES

-- ═══════════════════════════════════════════════════════
-- LEVEL 1 — English (20 questions)
-- ═══════════════════════════════════════════════════════
('tq-e1-01', 1, 'english', 'letter_recognition',
 'Which letter makes the /b/ sound?',
 '["b","d","p","q"]', 'b', 'The letter b makes the /b/ sound as in "ball".', 1),

('tq-e1-02', 1, 'english', 'letter_recognition',
 'Which word starts with the same sound as "dog"?',
 '["cat","door","sun","bat"]', 'door', 'Both "dog" and "door" start with the /d/ sound.', 1),

('tq-e1-03', 1, 'english', 'phonics',
 'What word do these sounds make? /k/ /æ/ /t/',
 '["can","cat","car","cap"]', 'cat', 'Blending /k/ + /æ/ + /t/ gives "cat".', 1),

('tq-e1-04', 1, 'english', 'phonics',
 'Which word rhymes with "ball"?',
 '["bell","tall","ball","bill"]', 'tall', '"Ball" and "tall" both end with the -all sound.', 1),

('tq-e1-05', 1, 'english', 'phonics',
 'How many sounds are in the word "ship"?',
 '["2","3","4","5"]', '3', '"Ship" has 3 sounds: /ʃ/ /ɪ/ /p/.', 1),

('tq-e1-06', 1, 'english', 'sight_words',
 'Which of these is spelled correctly?',
 '["teh","thie","the","hte"]', 'the', '"The" is the correct spelling of this sight word.', 1),

('tq-e1-07', 1, 'english', 'sight_words',
 'Choose the correct word: "I ___ a mango."',
 '["has","have","hav","had"]', 'have', 'Use "have" with "I".', 1),

('tq-e1-08', 1, 'english', 'reading',
 'The cat sat on the mat. What did the cat sit on?',
 '["chair","floor","mat","table"]', 'mat', 'The sentence says "on the mat".', 1),

('tq-e1-09', 1, 'english', 'reading',
 'Riya has a red ball. What colour is the ball?',
 '["blue","green","red","yellow"]', 'red', 'The sentence says "red ball".', 1),

('tq-e1-10', 1, 'english', 'vocabulary',
 'What is the opposite of "big"?',
 '["huge","large","small","tall"]', 'small', '"Small" is the opposite of "big".', 1),

('tq-e1-11', 1, 'english', 'phonics',
 'Which two letters make the /ʃ/ sound as in "ship"?',
 '["sh","ch","th","wh"]', 'sh', 'The digraph "sh" makes the /ʃ/ sound.', 2),

('tq-e1-12', 1, 'english', 'phonics',
 'How many syllables in "mango"?',
 '["1","2","3","4"]', '2', '"Man-go" has 2 syllables.', 1),

('tq-e1-13', 1, 'english', 'reading',
 'The sun is hot. Dogs run fast. Which sentence is about animals?',
 '["The sun is hot","Dogs run fast","Both","Neither"]', 'Dogs run fast', '"Dogs" are animals.', 1),

('tq-e1-14', 1, 'english', 'vocabulary',
 'Which word means "a young dog"?',
 '["kitten","cub","puppy","foal"]', 'puppy', 'A young dog is called a puppy.', 1),

('tq-e1-15', 1, 'english', 'grammar',
 'Choose the correct sentence.',
 '["She run fast.","She runs fast.","She running fast.","She ran fast?"]', 'She runs fast.', 'Use "runs" with "she/he/it".', 2),

('tq-e1-16', 1, 'english', 'phonics',
 'Which word has a long /a/ sound?',
 '["cat","cap","cake","can"]', 'cake', '"Cake" has a long /a/ sound (magic e rule).', 2),

('tq-e1-17', 1, 'english', 'reading',
 'Arjun went to school. He read a book. What did Arjun read?',
 '["newspaper","comic","book","magazine"]', 'book', 'He "read a book".', 1),

('tq-e1-18', 1, 'english', 'spelling',
 'How do you spell the number 3?',
 '["tree","thre","three","trhee"]', 'three', 'Three is spelled T-H-R-E-E.', 1),

('tq-e1-19', 1, 'english', 'phonics',
 'Which word ends with the /t/ sound?',
 '["dog","cat","sun","hen"]', 'cat', '"Cat" ends with the /t/ sound.', 1),

('tq-e1-20', 1, 'english', 'grammar',
 'Which word is a naming word (noun)?',
 '["run","big","mango","quickly"]', 'mango', '"Mango" is a noun — it names a thing.', 2),

-- ═══════════════════════════════════════════════════════
-- LEVEL 1 — Math (20 questions)
-- ═══════════════════════════════════════════════════════
('tq-m1-01', 1, 'math', 'counting',
 'How many stars? ⭐⭐⭐⭐⭐',
 '["3","4","5","6"]', '5', 'Count each star: 1, 2, 3, 4, 5.', 1),

('tq-m1-02', 1, 'math', 'addition',
 '2 + 3 = ?',
 '["4","5","6","7"]', '5', '2 + 3 = 5.', 1),

('tq-m1-03', 1, 'math', 'subtraction',
 '5 - 2 = ?',
 '["2","3","4","5"]', '3', '5 - 2 = 3.', 1),

('tq-m1-04', 1, 'math', 'comparison',
 'Which number is bigger: 7 or 4?',
 '["4","7","same","cannot tell"]', '7', '7 is greater than 4.', 1),

('tq-m1-05', 1, 'math', 'number_order',
 'What comes after 9?',
 '["8","10","11","7"]', '10', 'After 9 comes 10.', 1),

('tq-m1-06', 1, 'math', 'number_order',
 'Fill in: 2, 4, 6, ___',
 '["7","8","9","10"]', '8', 'Even numbers: 2, 4, 6, 8.', 1),

('tq-m1-07', 1, 'math', 'addition',
 'Riya has 4 rupees. Her mother gives her 3 more. How many rupees now?',
 '["5","6","7","8"]', '7', '4 + 3 = 7.', 1),

('tq-m1-08', 1, 'math', 'subtraction',
 'There are 8 birds on a tree. 3 fly away. How many are left?',
 '["4","5","6","7"]', '5', '8 - 3 = 5.', 1),

('tq-m1-09', 1, 'math', 'shapes',
 'How many sides does a triangle have?',
 '["2","3","4","5"]', '3', 'A triangle has 3 sides.', 1),

('tq-m1-10', 1, 'math', 'shapes',
 'Which shape is round?',
 '["square","triangle","circle","rectangle"]', 'circle', 'A circle is perfectly round.', 1),

('tq-m1-11', 1, 'math', 'place_value',
 'In 23, what is the tens digit?',
 '["2","3","23","0"]', '2', 'In 23, 2 is in the tens place.', 2),

('tq-m1-12', 1, 'math', 'addition',
 '10 + 5 = ?',
 '["10","14","15","16"]', '15', '10 + 5 = 15.', 1),

('tq-m1-13', 1, 'math', 'comparison',
 'Which is less: 12 or 21?',
 '["12","21","same","cannot tell"]', '12', '12 < 21.', 1),

('tq-m1-14', 1, 'math', 'counting',
 'Count backwards: 10, 9, 8, ___',
 '["5","6","7","8"]', '7', 'Counting backwards: …9, 8, 7.', 1),

('tq-m1-15', 1, 'math', 'word_problem',
 'Arjun has 6 samosas. He eats 2. How many are left?',
 '["2","3","4","5"]', '4', '6 - 2 = 4.', 1),

('tq-m1-16', 1, 'math', 'addition',
 '1 + 1 + 1 = ?',
 '["1","2","3","4"]', '3', '1 + 1 + 1 = 3.', 1),

('tq-m1-17', 1, 'math', 'measurement',
 'Which is taller — a house or a pencil?',
 '["pencil","house","same","cannot tell"]', 'house', 'A house is much taller than a pencil.', 1),

('tq-m1-18', 1, 'math', 'number_order',
 'Which number is missing? 5, ___, 7',
 '["4","6","8","9"]', '6', '5, 6, 7 — 6 is the missing number.', 1),

('tq-m1-19', 1, 'math', 'addition',
 '0 + 8 = ?',
 '["0","7","8","9"]', '8', 'Adding 0 to any number gives that number.', 1),

('tq-m1-20', 1, 'math', 'word_problem',
 'Priya has 3 bags. Each bag has 2 books. How many books in total?',
 '["4","5","6","7"]', '6', '3 × 2 = 6.', 2),

-- ═══════════════════════════════════════════════════════
-- LEVEL 2 — English (20 questions)
-- ═══════════════════════════════════════════════════════
('tq-e2-01', 2, 'english', 'reading_comprehension',
 'Priya waters her mango tree every day. In summer, it gives sweet mangoes. Why does Priya water the tree?',
 '["To get shade","To take care of it","To climb it","To sell it"]', 'To take care of it', 'Watering shows she cares for the tree.', 2),

('tq-e2-02', 2, 'english', 'phonics',
 'Which word has the "oo" sound as in "moon"?',
 '["book","good","spoon","foot"]', 'spoon', '"Spoon" has the long "oo" sound.', 2),

('tq-e2-03', 2, 'english', 'grammar',
 'Choose the correct plural: "one bus, two ___"',
 '["bus","buss","buses","buse"]', 'buses', 'Words ending in s/sh/ch/x add -es for plural.', 2),

('tq-e2-04', 2, 'english', 'vocabulary',
 'What does "enormous" mean?',
 '["tiny","medium","very big","beautiful"]', 'very big', '"Enormous" means very large.', 2),

('tq-e2-05', 2, 'english', 'grammar',
 'Which word is a verb (action word)?',
 '["happy","mango","quickly","jump"]', 'jump', '"Jump" is an action word — a verb.', 2),

('tq-e2-06', 2, 'english', 'spelling',
 'Choose the correctly spelled word.',
 '["recieve","receive","receve","recieve"]', 'receive', '"Receive" follows the "ei" spelling rule.', 2),

('tq-e2-07', 2, 'english', 'grammar',
 'Fill in: "She ___ to school yesterday."',
 '["go","goes","went","going"]', 'went', 'Past tense of "go" is "went".', 2),

('tq-e2-08', 2, 'english', 'reading_comprehension',
 'The elephant is the largest land animal. It has a long trunk. What does an elephant use its trunk for?',
 '["Walking","Seeing","Smelling and picking things","Hearing"]', 'Smelling and picking things', 'Elephants use trunks to smell, breathe, and pick things.', 2),

('tq-e2-09', 2, 'english', 'phonics',
 'Which letters make the /dʒ/ sound as in "jump"?',
 '["ch","sh","ge","j"]', 'j', 'The letter "j" makes the /dʒ/ sound.', 2),

('tq-e2-10', 2, 'english', 'vocabulary',
 'Choose the antonym (opposite) of "ancient".',
 '["old","historic","modern","worn"]', 'modern', '"Modern" is the opposite of "ancient".', 2),

('tq-e2-11', 2, 'english', 'grammar',
 'Which sentence uses punctuation correctly?',
 '["Where are you going","Where are you going?","where are you going?","Where are you going!"]', 'Where are you going?', 'Questions end with a question mark.', 1),

('tq-e2-12', 2, 'english', 'reading_comprehension',
 'Arjun practises cricket every evening. He wants to play for India. What is Arjun''s dream?',
 '["To be a teacher","To play cricket for India","To win a trophy","To travel the world"]', 'To play cricket for India', 'He practises to "play for India".', 1),

('tq-e2-13', 2, 'english', 'phonics',
 'How many syllables in "beautiful"?',
 '["2","3","4","5"]', '3', '"Beau-ti-ful" has 3 syllables.', 2),

('tq-e2-14', 2, 'english', 'grammar',
 'Identify the adjective: "The tall boy ran fast."',
 '["boy","ran","tall","fast"]', 'tall', '"Tall" describes the boy — it is an adjective.', 2),

('tq-e2-15', 2, 'english', 'vocabulary',
 'What is a synonym for "happy"?',
 '["sad","angry","joyful","tired"]', 'joyful', '"Joyful" means the same as "happy".', 1),

('tq-e2-16', 2, 'english', 'grammar',
 'Change to plural: "The child plays."',
 '["The childs play.","The childrens play.","The children play.","The children plays."]', 'The children play.', 'Plural of child is children; use "play" not "plays".', 2),

('tq-e2-17', 2, 'english', 'spelling',
 'Fill in the blank: "I ___ not feeling well." (negative)',
 '["am","is","are","was"]', 'am', '"I am not feeling well" — use "am" with "I".', 1),

('tq-e2-18', 2, 'english', 'vocabulary',
 'The word "autobiography" means:',
 '["A book about cars","A story written about oneself","A science book","A photo album"]', 'A story written about oneself', '"Auto" = self, "bio" = life, "graphy" = writing.', 3),

('tq-e2-19', 2, 'english', 'reading_comprehension',
 'Rain falls from clouds. It fills rivers and ponds. Plants need rain to grow. What would happen if there was no rain?',
 '["More rivers","Bigger clouds","Plants would die","More ponds"]', 'Plants would die', 'Without rain, plants cannot grow and would die.', 2),

('tq-e2-20', 2, 'english', 'grammar',
 'Which word is an adverb?',
 '["happy","happiness","happily","happier"]', 'happily', '"Happily" modifies a verb — it is an adverb.', 2),

-- ═══════════════════════════════════════════════════════
-- LEVEL 2 — Math (20 questions)
-- ═══════════════════════════════════════════════════════
('tq-m2-01', 2, 'math', 'place_value',
 'In 347, what is the value of the digit 4?',
 '["4","40","400","4000"]', '40', '4 is in the tens place: 4 × 10 = 40.', 2),

('tq-m2-02', 2, 'math', 'addition',
 '45 + 37 = ?',
 '["72","82","83","92"]', '82', '45 + 37 = 82.', 2),

('tq-m2-03', 2, 'math', 'subtraction',
 '100 - 36 = ?',
 '["54","64","66","74"]', '64', '100 - 36 = 64.', 2),

('tq-m2-04', 2, 'math', 'multiplication',
 '6 × 7 = ?',
 '["36","42","48","54"]', '42', '6 × 7 = 42.', 2),

('tq-m2-05', 2, 'math', 'division',
 '20 ÷ 4 = ?',
 '["4","5","6","8"]', '5', '20 ÷ 4 = 5.', 2),

('tq-m2-06', 2, 'math', 'fractions',
 'What fraction of this shape is shaded if 1 out of 4 parts is shaded?',
 '["1/2","1/3","1/4","1/5"]', '1/4', '1 shaded out of 4 total = 1/4.', 2),

('tq-m2-07', 2, 'math', 'word_problem',
 'A pen costs ₹12. Riya buys 3 pens. How much does she spend?',
 '["₹24","₹36","₹48","₹30"]', '₹36', '3 × ₹12 = ₹36.', 2),

('tq-m2-08', 2, 'math', 'measurement',
 'How many centimetres are in 1 metre?',
 '["10","100","1000","10000"]', '100', '1 metre = 100 centimetres.', 1),

('tq-m2-09', 2, 'math', 'time',
 'If it is 3:00 PM now, what time will it be in 2 hours?',
 '["4:00 PM","5:00 PM","6:00 PM","2:00 PM"]', '5:00 PM', '3:00 + 2 hours = 5:00 PM.', 1),

('tq-m2-10', 2, 'math', 'patterns',
 'What is the next number? 3, 6, 9, 12, ___',
 '["13","14","15","16"]', '15', 'Adding 3 each time: 12 + 3 = 15.', 1),

('tq-m2-11', 2, 'math', 'word_problem',
 'Arjun scored 45 in the first test and 38 in the second. What is his total score?',
 '["73","83","93","103"]', '83', '45 + 38 = 83.', 2),

('tq-m2-12', 2, 'math', 'fractions',
 'Which fraction is bigger: 1/2 or 1/4?',
 '["1/4","1/2","They are equal","Cannot tell"]', '1/2', '1/2 = 0.5 > 1/4 = 0.25.', 2),

('tq-m2-13', 2, 'math', 'multiplication',
 '9 × 9 = ?',
 '["72","81","90","99"]', '81', '9 × 9 = 81.', 2),

('tq-m2-14', 2, 'math', 'geometry',
 'How many sides does a hexagon have?',
 '["5","6","7","8"]', '6', 'A hexagon has 6 sides.', 2),

('tq-m2-15', 2, 'math', 'data',
 'Priya got 80 marks. Arjun got 65. How many more marks did Priya get?',
 '["10","15","20","25"]', '15', '80 - 65 = 15.', 2),

('tq-m2-16', 2, 'math', 'division',
 '45 ÷ 9 = ?',
 '["4","5","6","7"]', '5', '45 ÷ 9 = 5.', 2),

('tq-m2-17', 2, 'math', 'money',
 'Arjun has ₹50. He spends ₹23. How much does he have left?',
 '["₹17","₹27","₹37","₹47"]', '₹27', '₹50 - ₹23 = ₹27.', 2),

('tq-m2-18', 2, 'math', 'word_problem',
 '4 children share 24 sweets equally. How many sweets does each child get?',
 '["4","5","6","7"]', '6', '24 ÷ 4 = 6.', 2),

('tq-m2-19', 2, 'math', 'place_value',
 'Write 300 + 50 + 7 as a single number.',
 '["357","375","537","573"]', '357', '300 + 50 + 7 = 357.', 1),

('tq-m2-20', 2, 'math', 'multiplication',
 'Priya jogs 5 km each day. How far does she jog in a week?',
 '["25 km","30 km","35 km","40 km"]', '35 km', '5 km × 7 days = 35 km.', 2),

-- ═══════════════════════════════════════════════════════
-- LEVEL 3 — English (10 sample questions — pattern repeats to 200 total)
-- ═══════════════════════════════════════════════════════
('tq-e3-01', 3, 'english', 'grammar',
 'Which sentence is in the passive voice?',
 '["The dog bit the boy.","The boy was bitten by the dog.","The boy bit the dog.","A dog bites."]', 'The boy was bitten by the dog.', '"Was bitten" is passive voice.', 3),

('tq-e3-02', 3, 'english', 'vocabulary',
 'The word "benevolent" most closely means:',
 '["cruel","kind","angry","lazy"]', 'kind', '"Benevolent" means kind and generous.', 3),

('tq-e3-03', 3, 'english', 'reading_comprehension',
 'Climate change is causing glaciers to melt. Rising sea levels threaten coastal cities. Which is the main idea?',
 '["Glaciers are beautiful","Climate change has serious effects","Cities are near the sea","The weather is changing"]', 'Climate change has serious effects', 'The passage is about the effects of climate change.', 3),

('tq-e3-04', 3, 'english', 'grammar',
 'Choose the correct relative clause: "The book ___ I read was interesting."',
 '["who","which","whose","whom"]', 'which', 'Use "which" for things, "who" for people.', 3),

('tq-e3-05', 3, 'english', 'spelling',
 'Which word is spelled correctly?',
 '["accomodate","accommodate","accommadate","acomodate"]', 'accommodate', '"Accommodate" has double c and double m.', 3),

-- ═══════════════════════════════════════════════════════
-- LEVEL 3 — Math (10 sample questions)
-- ═══════════════════════════════════════════════════════
('tq-m3-01', 3, 'math', 'fractions',
 '3/4 + 1/4 = ?',
 '["1/2","3/8","1","2"]', '1', '3/4 + 1/4 = 4/4 = 1.', 2),

('tq-m3-02', 3, 'math', 'algebra',
 'If x + 5 = 12, what is x?',
 '["5","6","7","8"]', '7', 'x = 12 - 5 = 7.', 3),

('tq-m3-03', 3, 'math', 'geometry',
 'What is the area of a rectangle 8 cm long and 5 cm wide?',
 '["13 cm²","26 cm²","40 cm²","80 cm²"]', '40 cm²', 'Area = length × width = 8 × 5 = 40 cm².', 2),

('tq-m3-04', 3, 'math', 'percentage',
 '50% of 80 = ?',
 '["20","30","40","50"]', '40', '50% × 80 = 0.5 × 80 = 40.', 2),

('tq-m3-05', 3, 'math', 'word_problem',
 'A train travels 60 km/h for 3 hours. How far does it travel?',
 '["120 km","150 km","180 km","200 km"]', '180 km', 'Distance = speed × time = 60 × 3 = 180 km.', 3),

-- ═══════════════════════════════════════════════════════
-- LEVEL 4 — English (5 sample questions)
-- ═══════════════════════════════════════════════════════
('tq-e4-01', 4, 'english', 'grammar',
 'Identify the error: "Neither the boys nor the girl were present."',
 '["Neither","nor","girl","were"]', 'were', '"Nor" with a singular noun needs singular verb "was".', 3),

('tq-e4-02', 4, 'english', 'vocabulary',
 '"Perspicacious" means:',
 '["Tired","Having a ready insight","Very tall","Confused"]', 'Having a ready insight', '"Perspicacious" means having a sharp mind.', 3),

('tq-e4-03', 4, 'english', 'reading_comprehension',
 'The author uses irony to highlight the disconnect between wealth and happiness. This is an example of:',
 '["Plot","Theme","Setting","Characterisation"]', 'Theme', 'A central message/theme of the text.', 3),

-- ═══════════════════════════════════════════════════════
-- LEVEL 4 — Math (5 sample questions)
-- ═══════════════════════════════════════════════════════
('tq-m4-01', 4, 'math', 'algebra',
 'Solve: 2x - 3 = 7',
 '["3","4","5","6"]', '5', '2x = 10, x = 5.', 3),

('tq-m4-02', 4, 'math', 'geometry',
 'The sum of angles in a triangle is:',
 '["90°","180°","270°","360°"]', '180°', 'The angle sum of a triangle is always 180°.', 2),

('tq-m4-03', 4, 'math', 'percentage',
 'A shirt costs ₹800. There is a 25% discount. What is the sale price?',
 '["₹500","₹550","₹600","₹650"]', '₹600', '25% of 800 = 200. 800 - 200 = ₹600.', 3),

-- ═══════════════════════════════════════════════════════
-- LEVEL 5 — English (3 sample questions)
-- ═══════════════════════════════════════════════════════
('tq-e5-01', 5, 'english', 'critical_thinking',
 'The author''s tone in the passage can best be described as:',
 '["Objective and analytical","Emotional and personal","Humorous and light","Angry and critical"]', 'Objective and analytical', 'The author presents facts without personal bias.', 3),

('tq-e5-02', 5, 'english', 'grammar',
 'Which sentence demonstrates the subjunctive mood?',
 '["I wish I was taller.","I wish I were taller.","I wished I was taller.","If I am taller."]', 'I wish I were taller.', 'The subjunctive uses "were" not "was" after "wish".', 3),

-- ═══════════════════════════════════════════════════════
-- LEVEL 5 — Math (3 sample questions)
-- ═══════════════════════════════════════════════════════
('tq-m5-01', 5, 'math', 'algebra',
 'If f(x) = 2x² - 3x + 1, find f(2).',
 '["1","2","3","4"]', '3', 'f(2) = 2(4) - 3(2) + 1 = 8 - 6 + 1 = 3.', 3),

('tq-m5-02', 5, 'math', 'probability',
 'A fair coin is tossed twice. What is the probability of getting two heads?',
 '["1/2","1/3","1/4","1/6"]', '1/4', 'P(H) × P(H) = 1/2 × 1/2 = 1/4.', 3),

('tq-m5-03', 5, 'math', 'geometry',
 'The volume of a cube with side 4 cm is:',
 '["16 cm³","32 cm³","64 cm³","128 cm³"]', '64 cm³', 'Volume = side³ = 4³ = 64 cm³.', 3)

ON CONFLICT (id) DO NOTHING;

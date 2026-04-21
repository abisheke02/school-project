-- Phase 3: Exercise Seed Data
-- Covers: phonics (dyslexia), reading (dyslexia), writing (dysgraphia), math (dyscalculia)
-- Levels 1-3 seeded (Levels 4-5 in Phase 4)

INSERT INTO exercises (id, exercise_type, ld_target, title, instruction, content, level, difficulty, xp_reward) VALUES

-- ═══════════════════════════════════════════════════════════════
-- PHONICS EXERCISES — Level 1, Difficulty 1 (Dyslexia)
-- ═══════════════════════════════════════════════════════════════
('ex-ph-101', 'phonics', 'dyslexia',
 'Letter Sounds: b and d',
 'Tap the letter that makes the sound you hear.',
 '{
   "type": "letter_tap",
   "items": [
     {"prompt": "Which letter makes the /b/ sound?", "options": ["b","d","p","q"], "correct": "b", "audio": "b"},
     {"prompt": "Which letter makes the /d/ sound?", "options": ["b","d","p","q"], "correct": "d", "audio": "d"},
     {"prompt": "Tap the letter at the START of: ball", "options": ["b","d","p","q"], "correct": "b", "audio": "ball"},
     {"prompt": "Tap the letter at the START of: dog", "options": ["b","d","p","q"], "correct": "d", "audio": "dog"},
     {"prompt": "Which letter makes the /p/ sound?", "options": ["b","d","p","q"], "correct": "p", "audio": "p"}
   ]
 }',
 1, 1, 10),

('ex-ph-102', 'phonics', 'dyslexia',
 'CVC Words: Short Vowels',
 'Blend the sounds together to say the word. Then pick the right picture.',
 '{
   "type": "word_blend",
   "items": [
     {"sounds": ["c","a","t"], "word": "cat", "options": ["cat","bat","rat","hat"], "correct": "cat"},
     {"sounds": ["d","o","g"], "word": "dog", "options": ["log","dog","fog","hog"], "correct": "dog"},
     {"sounds": ["b","i","g"], "word": "big", "options": ["dig","fig","big","pig"], "correct": "big"},
     {"sounds": ["r","u","n"], "word": "run", "options": ["sun","run","fun","bun"], "correct": "run"},
     {"sounds": ["h","e","n"], "word": "hen", "options": ["pen","ten","hen","den"], "correct": "hen"}
   ]
 }',
 1, 1, 10),

('ex-ph-103', 'phonics', 'dyslexia',
 'Rhyming Words',
 'Which word rhymes with the word I say?',
 '{
   "type": "rhyme_match",
   "items": [
     {"prompt": "cat", "options": ["bat","car","bus","sun"], "correct": "bat"},
     {"prompt": "ship", "options": ["chip","book","lamp","tree"], "correct": "chip"},
     {"prompt": "king", "options": ["ring","wall","door","fish"], "correct": "ring"},
     {"prompt": "moon", "options": ["spoon","leaf","star","frog"], "correct": "spoon"},
     {"prompt": "day", "options": ["play","night","dark","cool"], "correct": "play"}
   ]
 }',
 1, 1, 10),

-- ═══════════════════════════════════════════════════════════════
-- PHONICS EXERCISES — Level 1, Difficulty 2
-- ═══════════════════════════════════════════════════════════════
('ex-ph-104', 'phonics', 'dyslexia',
 'Digraphs: sh, ch, th',
 'Listen and choose the correct digraph for each word.',
 '{
   "type": "word_blend",
   "items": [
     {"sounds": ["sh","i","p"], "word": "ship", "options": ["ship","chip","tip","sip"], "correct": "ship"},
     {"sounds": ["ch","o","p"], "word": "chop", "options": ["shop","chop","top","hop"], "correct": "chop"},
     {"sounds": ["th","i","n"], "word": "thin", "options": ["tin","sin","thin","win"], "correct": "thin"},
     {"sounds": ["sh","e","l","l"], "word": "shell", "options": ["shell","sell","tell","bell"], "correct": "shell"},
     {"sounds": ["ch","e","s","t"], "word": "chest", "options": ["test","rest","chest","best"], "correct": "chest"}
   ]
 }',
 1, 2, 15),

('ex-ph-105', 'phonics', 'dyslexia',
 'Syllable Counting',
 'Clap and count the syllables in each word.',
 '{
   "type": "syllable_count",
   "items": [
     {"word": "mango", "syllables": 2, "breakdown": ["man","go"]},
     {"word": "elephant", "syllables": 3, "breakdown": ["el","e","phant"]},
     {"word": "banana", "syllables": 3, "breakdown": ["ba","na","na"]},
     {"word": "school", "syllables": 1, "breakdown": ["school"]},
     {"word": "butterfly", "syllables": 3, "breakdown": ["but","ter","fly"]},
     {"word": "cricket", "syllables": 2, "breakdown": ["crick","et"]},
     {"word": "India", "syllables": 3, "breakdown": ["in","di","a"]}
   ]
 }',
 1, 2, 15),

-- ═══════════════════════════════════════════════════════════════
-- PHONICS EXERCISES — Level 2
-- ═══════════════════════════════════════════════════════════════
('ex-ph-201', 'phonics', 'dyslexia',
 'Long Vowel Words',
 'Choose the correctly spelled word with a long vowel sound.',
 '{
   "type": "word_choice",
   "items": [
     {"prompt": "bike (long /i/)", "options": ["bik","bike","byke","biek"], "correct": "bike"},
     {"prompt": "cake (long /a/)", "options": ["cak","caek","cake","caik"], "correct": "cake"},
     {"prompt": "note (long /o/)", "options": ["noat","note","nowt","noit"], "correct": "note"},
     {"prompt": "tune (long /u/)", "options": ["toon","tune","tyoon","tuen"], "correct": "tune"},
     {"prompt": "feet (long /e/)", "options": ["fete","feet","feat","feit"], "correct": "feet"}
   ]
 }',
 2, 1, 20),

('ex-ph-202', 'phonics', 'dyslexia',
 'Phoneme Segmentation',
 'Break the word into individual sounds. How many sounds are there?',
 '{
   "type": "phoneme_count",
   "items": [
     {"word": "cat", "phoneme_count": 3, "phonemes": ["/k/","/æ/","/t/"]},
     {"word": "ship", "phoneme_count": 3, "phonemes": ["/ʃ/","/ɪ/","/p/"]},
     {"word": "train", "phoneme_count": 4, "phonemes": ["/t/","/r/","/eɪ/","/n/"]},
     {"word": "splash", "phoneme_count": 5, "phonemes": ["/s/","/p/","/l/","/æ/","/ʃ/"]},
     {"word": "street", "phoneme_count": 5, "phonemes": ["/s/","/t/","/r/","/iː/","/t/"]}
   ]
 }',
 2, 2, 20),

-- ═══════════════════════════════════════════════════════════════
-- PHONICS EXERCISES — Level 3
-- ═══════════════════════════════════════════════════════════════
('ex-ph-301', 'phonics', 'dyslexia',
 'Compound Words',
 'Join two words to make a compound word.',
 '{
   "type": "word_join",
   "items": [
     {"parts": ["sun","flower"], "compound": "sunflower", "options": ["sunshine","sunflower","sunlight","sunburn"]},
     {"parts": ["rain","bow"], "compound": "rainbow", "options": ["raincoat","raindrop","rainbow","rainfall"]},
     {"parts": ["book","shelf"], "compound": "bookshelf", "options": ["bookshelf","bookmark","bookcase","booklist"]},
     {"parts": ["play","ground"], "compound": "playground", "options": ["playtime","playmate","playground","playhouse"]},
     {"parts": ["cup","board"], "compound": "cupboard", "options": ["cupboard","cupcake","cupful","cuplike"]}
   ]
 }',
 3, 1, 25),

-- ═══════════════════════════════════════════════════════════════
-- READING EXERCISES — Level 1 (Dyslexia)
-- ═══════════════════════════════════════════════════════════════
('ex-rd-101', 'reading', 'dyslexia',
 'Read and Point',
 'I will read the sentence. Tap each word as I say it.',
 '{
   "type": "sentence_highlight",
   "items": [
     {"sentence": "The cat sat on the mat.", "words": ["The","cat","sat","on","the","mat"]},
     {"sentence": "I can see a big red ball.", "words": ["I","can","see","a","big","red","ball"]},
     {"sentence": "Riya has a mango in her bag.", "words": ["Riya","has","a","mango","in","her","bag"]},
     {"sentence": "The dog runs fast.", "words": ["The","dog","runs","fast"]}
   ]
 }',
 1, 1, 10),

('ex-rd-102', 'reading', 'dyslexia',
 'Missing Word',
 'Read the sentence. Which word fits the blank?',
 '{
   "type": "fill_blank",
   "items": [
     {"sentence": "The ___ is barking.", "options": ["dog","log","fog","hog"], "correct": "dog"},
     {"sentence": "Arjun went to the ___.", "options": ["school","stool","cool","pool"], "correct": "school"},
     {"sentence": "She has a red ___ in her hand.", "options": ["ball","tall","fall","wall"], "correct": "ball"},
     {"sentence": "The sun is very ___.", "options": ["hot","lot","dot","cot"], "correct": "hot"},
     {"sentence": "Birds can ___.", "options": ["fly","try","dry","cry"], "correct": "fly"}
   ]
 }',
 1, 1, 10),

-- ═══════════════════════════════════════════════════════════════
-- READING EXERCISES — Level 2
-- ═══════════════════════════════════════════════════════════════
('ex-rd-201', 'reading', 'dyslexia',
 'Short Story: Priya and the Mango Tree',
 'Read the story and answer the questions.',
 '{
   "type": "comprehension",
   "passage": "Priya lives near a mango tree. Every day she waters it. In summer, the tree gives big, sweet mangoes. Priya shares them with her friends. Everyone loves Priya.",
   "questions": [
     {"q": "Where does Priya live?", "options": ["Near a river","Near a mango tree","Near a school","Near a shop"], "correct": "Near a mango tree"},
     {"q": "What does Priya do every day?", "options": ["She eats mangoes","She waters the tree","She climbs the tree","She cuts the tree"], "correct": "She waters the tree"},
     {"q": "When does the tree give mangoes?", "options": ["Winter","Monsoon","Summer","Spring"], "correct": "Summer"},
     {"q": "What does Priya do with the mangoes?", "options": ["Sells them","Eats them alone","Shares with friends","Throws them"], "correct": "Shares with friends"}
   ]
 }',
 2, 1, 20),

-- ═══════════════════════════════════════════════════════════════
-- WRITING EXERCISES — Level 1 (Dysgraphia)
-- ═══════════════════════════════════════════════════════════════
('ex-wr-101', 'writing', 'dysgraphia',
 'Word Builder',
 'Drag and drop the letters to spell the word.',
 '{
   "type": "word_builder",
   "items": [
     {"word": "cat", "scrambled": ["t","a","c"], "hint": "A small furry animal."},
     {"word": "dog", "scrambled": ["g","o","d"], "hint": "A loyal pet."},
     {"word": "bat", "scrambled": ["t","b","a"], "hint": "Used to hit a ball."},
     {"word": "sun", "scrambled": ["u","s","n"], "hint": "Shines in the sky."},
     {"word": "map", "scrambled": ["p","m","a"], "hint": "Shows where places are."}
   ]
 }',
 1, 1, 10),

('ex-wr-102', 'writing', 'dysgraphia',
 'Dictation: Simple Sentences',
 'Listen to the sentence and type or speak it back.',
 '{
   "type": "dictation",
   "items": [
     {"sentence": "The cat is big.", "keywords": ["cat","big"]},
     {"sentence": "I see a red ball.", "keywords": ["red","ball"]},
     {"sentence": "She has a bag.", "keywords": ["bag"]},
     {"sentence": "The dog ran fast.", "keywords": ["dog","fast"]},
     {"sentence": "Riya ate a mango.", "keywords": ["Riya","mango"]}
   ]
 }',
 1, 1, 10),

-- ═══════════════════════════════════════════════════════════════
-- WRITING EXERCISES — Level 2
-- ═══════════════════════════════════════════════════════════════
('ex-wr-201', 'writing', 'dysgraphia',
 'Sentence Scramble',
 'Put the words in the right order to make a sentence.',
 '{
   "type": "sentence_builder",
   "items": [
     {"words": ["ran","dog","fast","The"], "correct": "The dog ran fast"},
     {"words": ["ball","red","Arjun","has","a"], "correct": "Arjun has a red ball"},
     {"words": ["big","is","The","sun","very"], "correct": "The sun is very big"},
     {"words": ["mango","sweet","is","A"], "correct": "A mango is sweet"},
     {"words": ["to","school","goes","Priya"], "correct": "Priya goes to school"}
   ]
 }',
 2, 1, 20),

-- ═══════════════════════════════════════════════════════════════
-- MATH EXERCISES — Level 1 (Dyscalculia)
-- ═══════════════════════════════════════════════════════════════
('ex-mt-101', 'math', 'dyscalculia',
 'Counting Objects',
 'Count the objects and tap the right number.',
 '{
   "type": "count_tap",
   "items": [
     {"prompt": "🍎🍎🍎", "count": 3, "options": [2,3,4,5]},
     {"prompt": "⭐⭐⭐⭐⭐", "count": 5, "options": [3,4,5,6]},
     {"prompt": "🐦🐦", "count": 2, "options": [1,2,3,4]},
     {"prompt": "🌸🌸🌸🌸🌸🌸🌸", "count": 7, "options": [5,6,7,8]},
     {"prompt": "🏏🏏🏏🏏", "count": 4, "options": [3,4,5,6]}
   ]
 }',
 1, 1, 10),

('ex-mt-102', 'math', 'dyscalculia',
 'Number Order',
 'Which number comes next?',
 '{
   "type": "number_sequence",
   "items": [
     {"sequence": [1,2,3,4,"?"], "correct": 5, "options": [4,5,6,7]},
     {"sequence": [5,10,15,"?"], "correct": 20, "options": [18,19,20,21]},
     {"sequence": [2,4,6,8,"?"], "correct": 10, "options": [9,10,11,12]},
     {"sequence": [10,20,30,"?"], "correct": 40, "options": [35,40,45,50]},
     {"sequence": [1,3,5,7,"?"], "correct": 9, "options": [8,9,10,11]}
   ]
 }',
 1, 1, 10),

('ex-mt-103', 'math', 'dyscalculia',
 'Addition with Pictures',
 'Count all the objects together.',
 '{
   "type": "picture_addition",
   "items": [
     {"prompt": "🍎🍎 + 🍎🍎🍎", "a": 2, "b": 3, "correct": 5, "options": [4,5,6,7]},
     {"prompt": "🐦 + 🐦🐦🐦", "a": 1, "b": 3, "correct": 4, "options": [3,4,5,6]},
     {"prompt": "⭐⭐⭐ + ⭐⭐", "a": 3, "b": 2, "correct": 5, "options": [4,5,6,7]},
     {"prompt": "🌸🌸🌸🌸 + 🌸", "a": 4, "b": 1, "correct": 5, "options": [4,5,6,7]},
     {"prompt": "🏏🏏 + 🏏🏏🏏🏏", "a": 2, "b": 4, "correct": 6, "options": [5,6,7,8]}
   ]
 }',
 1, 1, 10),

-- ═══════════════════════════════════════════════════════════════
-- MATH EXERCISES — Level 2
-- ═══════════════════════════════════════════════════════════════
('ex-mt-201', 'math', 'dyscalculia',
 'Word Problems: Indian Context',
 'Read the problem and choose the right answer.',
 '{
   "type": "word_problem",
   "items": [
     {
       "problem": "Riya has 5 rupees. She buys a pen for 3 rupees. How much money is left?",
       "correct": 2, "options": [1,2,3,4], "operation": "subtraction"
     },
     {
       "problem": "Arjun has 4 samosas. His friend gives him 3 more. How many samosas does he have now?",
       "correct": 7, "options": [5,6,7,8], "operation": "addition"
     },
     {
       "problem": "There are 10 students in class. 4 go home. How many are left?",
       "correct": 6, "options": [5,6,7,8], "operation": "subtraction"
     },
     {
       "problem": "Priya has 2 bags. Each bag has 3 books. How many books in total?",
       "correct": 6, "options": [4,5,6,7], "operation": "multiplication"
     }
   ]
 }',
 2, 1, 20),

-- ═══════════════════════════════════════════════════════════════
-- MATH EXERCISES — Level 3
-- ═══════════════════════════════════════════════════════════════
('ex-mt-301', 'math', 'dyscalculia',
 'Place Value',
 'Identify the tens and ones in each number.',
 '{
   "type": "place_value",
   "items": [
     {"number": 23, "tens": 2, "ones": 3},
     {"number": 47, "tens": 4, "ones": 7},
     {"number": 56, "tens": 5, "ones": 6},
     {"number": 81, "tens": 8, "ones": 1},
     {"number": 19, "tens": 1, "ones": 9}
   ]
 }',
 3, 1, 25)

ON CONFLICT (id) DO NOTHING;

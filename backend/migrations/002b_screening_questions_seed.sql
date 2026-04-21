-- Screening Questions Seed (50 questions)
-- Uses ON CONFLICT DO NOTHING for idempotent re-runs

INSERT INTO screening_questions (id, category, ld_target, question_text, question_type, options_json, correct_answer, audio_prompt, difficulty, age_min, age_max) VALUES

-- LETTER RECOGNITION (dyslexia)
('sq-001','letter_recognition','dyslexia','Which letter is different from the others?','mcq','{"options":["b","b","d","b"]}','d',NULL,1,5,10),
('sq-002','letter_recognition','dyslexia','Which letter makes the /b/ sound?','mcq','{"options":["d","b","p","q"]}','b','audio_b_sound',1,5,10),
('sq-003','letter_recognition','dyslexia','Which letter makes the /d/ sound?','mcq','{"options":["b","d","p","q"]}','d','audio_d_sound',1,5,10),
('sq-004','letter_recognition','dyslexia','Tap the letter at the START of: dog','mcq','{"options":["b","d","p","q"]}','d','audio_dog',1,5,10),
('sq-005','letter_recognition','dyslexia','Tap the letter at the START of: ball','mcq','{"options":["b","d","p","q"]}','b','audio_ball',1,5,10),
('sq-006','letter_recognition','dyslexia','Which of these is the letter b?','mcq','{"options":["b","d","p","q"]}','b',NULL,1,5,10),
('sq-007','letter_recognition','dyslexia','Which word is spelled correctly?','mcq','{"options":["doy","boy","poy","qoy"]}','boy',NULL,2,6,12),
('sq-008','letter_recognition','dyslexia','Which word is NOT spelled correctly?','mcq','{"options":["dad","bad","dab","bab"]}','bab',NULL,2,6,12),
('sq-009','letter_recognition','dyslexia','Find the mirror letter of b','mcq','{"options":["p","d","q","b"]}','d',NULL,2,7,12),
('sq-010','letter_recognition','dyslexia','Which two letters look like mirrors of each other?','mcq','{"options":["b and d","a and e","m and n","f and t"]}','b and d',NULL,2,8,14),
('sq-011','letter_recognition','dyslexia','Choose the correctly spelled word','mcq','{"options":["was","saw","wsa","aws"]}','was',NULL,2,7,12),
('sq-012','letter_recognition','dyslexia','Which letter comes after b in the alphabet?','mcq','{"options":["a","c","d","e"]}','c',NULL,1,6,10),

-- RHYME DETECTION (dyslexia)
('sq-013','rhyme_detection','dyslexia','Does cat rhyme with bat?','mcq','{"options":["Yes","No"]}','Yes','audio_cat_bat',1,5,10),
('sq-014','rhyme_detection','dyslexia','Does dog rhyme with cat?','mcq','{"options":["Yes","No"]}','No','audio_dog_cat',1,5,10),
('sq-015','rhyme_detection','dyslexia','Which word rhymes with cat?','mcq','{"options":["bat","dog","sun","fish"]}','bat','audio_cat',1,5,10),
('sq-016','rhyme_detection','dyslexia','Which word rhymes with ship?','mcq','{"options":["chip","shop","tap","bus"]}','chip','audio_ship',1,5,10),
('sq-017','rhyme_detection','dyslexia','Which word does NOT rhyme with king?','mcq','{"options":["ring","sing","wing","song"]}','song','audio_king',2,6,12),
('sq-018','rhyme_detection','dyslexia','How many words rhyme with day? play, say, book, may','mcq','{"options":["1","2","3","4"]}','3','audio_day_words',2,7,12),
('sq-019','rhyme_detection','dyslexia','Pick the odd one out (does not rhyme): hot, lot, dot, hat','mcq','{"options":["hot","lot","dot","hat"]}','hat',NULL,2,7,12),
('sq-020','rhyme_detection','dyslexia','Which word rhymes with moon?','mcq','{"options":["spoon","star","leaf","tree"]}','spoon','audio_moon',1,5,10),
('sq-021','rhyme_detection','dyslexia','Does rain rhyme with train?','mcq','{"options":["Yes","No"]}','Yes',NULL,1,5,10),
('sq-022','rhyme_detection','dyslexia','Which word rhymes with play?','mcq','{"options":["day","dog","cup","lamp"]}','day',NULL,1,5,10),

-- PHONEME BLENDING (dyslexia)
('sq-023','phoneme_blending','dyslexia','Blend: /k/ /æ/ /t/ — what word?','mcq','{"options":["can","cat","car","cap"]}','cat','audio_k_a_t',1,5,10),
('sq-024','phoneme_blending','dyslexia','Blend: /d/ /ɒ/ /g/ — what word?','mcq','{"options":["dog","dig","dug","dag"]}','dog','audio_d_o_g',1,5,10),
('sq-025','phoneme_blending','dyslexia','Blend: /ʃ/ /ɪ/ /p/ — what word?','mcq','{"options":["ship","chip","tip","sip"]}','ship','audio_sh_i_p',1,5,10),
('sq-026','phoneme_blending','dyslexia','How many sounds in the word cat?','mcq','{"options":["1","2","3","4"]}','3','audio_cat',1,5,10),
('sq-027','phoneme_blending','dyslexia','How many sounds in the word ship?','mcq','{"options":["2","3","4","5"]}','3','audio_ship',2,6,12),
('sq-028','phoneme_blending','dyslexia','How many syllables in mango?','mcq','{"options":["1","2","3","4"]}','2','audio_mango',1,5,10),
('sq-029','phoneme_blending','dyslexia','How many syllables in chocolate?','mcq','{"options":["2","3","4","5"]}','3','audio_chocolate',2,7,12),
('sq-030','phoneme_blending','dyslexia','Which word starts with two consonants together?','mcq','{"options":["apple","train","egg","ant"]}','train',NULL,2,7,12),
('sq-031','phoneme_blending','dyslexia','Blend: /r/ /eɪ/ /n/ — what word?','mcq','{"options":["run","rain","ran","rin"]}','rain','audio_r_ai_n',2,7,12),
('sq-032','phoneme_blending','dyslexia','How many sounds in splash?','mcq','{"options":["3","4","5","6"]}','5','audio_splash',3,9,14),

-- NUMBER SENSE (dyscalculia)
('sq-033','number_sense','dyscalculia','Count the stars: 1 2 3 4 5 — how many?','mcq','{"options":["4","5","6","7"]}','5','audio_count_5',1,5,8),
('sq-034','number_sense','dyscalculia','Which number is BIGGER: 7 or 3?','mcq','{"options":["7","3","same","not sure"]}','7',NULL,1,5,8),
('sq-035','number_sense','dyscalculia','What number comes AFTER 9?','mcq','{"options":["8","10","11","7"]}','10',NULL,1,5,8),
('sq-036','number_sense','dyscalculia','Riya has 3 apples. Her friend gives her 2 more. How many now?','mcq','{"options":["4","5","6","3"]}','5',NULL,1,5,8),
('sq-037','number_sense','dyscalculia','Which number is missing? 2, 4, ___, 8','mcq','{"options":["5","6","7","3"]}','6',NULL,1,5,8),
('sq-038','number_sense','dyscalculia','In 23, which digit is in the tens place?','mcq','{"options":["2","3","23","0"]}','2',NULL,2,7,12),
('sq-039','number_sense','dyscalculia','Arjun has 10 rupees. He spends 4. How many left?','mcq','{"options":["4","5","6","7"]}','6',NULL,2,7,12),
('sq-040','number_sense','dyscalculia','Which fraction is bigger: 1/2 or 1/4?','mcq','{"options":["1/2","1/4","same","cannot tell"]}','1/2',NULL,2,8,14),
('sq-041','number_sense','dyscalculia','5 x 3 = ?','mcq','{"options":["8","10","15","20"]}','15',NULL,2,8,14),
('sq-042','number_sense','dyscalculia','What is 50% of 80?','mcq','{"options":["20","30","40","50"]}','40',NULL,3,10,14),
('sq-043','number_sense','dyscalculia','Priya has 5 bags with 4 books each. Total books?','mcq','{"options":["9","16","20","25"]}','20',NULL,2,8,14),
('sq-044','number_sense','dyscalculia','A pen costs 12 rupees. Cost of 3 pens?','mcq','{"options":["24","36","48","30"]}','36',NULL,2,8,14),
('sq-045','number_sense','dyscalculia','Which number is between 15 and 20?','mcq','{"options":["14","17","21","22"]}','17',NULL,1,6,10),
('sq-046','number_sense','dyscalculia','Order from smallest: 9, 3, 7, 1','mcq','{"options":["1,3,7,9","3,1,9,7","9,7,3,1","1,9,3,7"]}','1,3,7,9',NULL,2,7,12),
('sq-047','number_sense','dyscalculia','How many sides does a square have?','mcq','{"options":["3","4","5","6"]}','4',NULL,1,5,8),
('sq-048','number_sense','dyscalculia','100 - 36 = ?','mcq','{"options":["54","64","66","74"]}','64',NULL,2,8,14),
('sq-049','number_sense','dyscalculia','Train travels 60 km/h for 2 hours. Distance?','mcq','{"options":["60 km","100 km","120 km","180 km"]}','120 km',NULL,3,10,14),
('sq-050','number_sense','dyscalculia','x + 5 = 12. Find x.','mcq','{"options":["5","6","7","8"]}','7',NULL,3,10,14)

ON CONFLICT (id) DO NOTHING;

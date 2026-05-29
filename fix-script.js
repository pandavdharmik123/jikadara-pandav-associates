import { convertUnicodeToHarikrishnaTemplate } from './src/utils/harikrishnaTemplate.js';
import fs from 'fs';

let content = fs.readFileSync('./src/utils/harikrishnaTemplate.js', 'utf8');

// 1. Change ઉ from o to u
content = content.replace(/ઉ: 'o'/, "ઉ: 'u'");

// 2. Map ( to { and ) to }
// Since they are not in any dict, let's add them to DIGIT_KEYS or create a PUNCTUATION_KEYS
content = content.replace(/const DIGIT_KEYS = \{/, "const DIGIT_KEYS = {\n  '(': '{', ')': '}',");

// 3. Add જી to CONJUNCTS
content = content.replace(/const CONJUNCTS = \{/, "const CONJUNCTS = {\n  'જી': 'J',");

// 4. Change સ્ to A
content = content.replace(/'સ્': '.*',/, "'સ્': 'A',");
content = content.replace(/xXÎWº~HMoVwÒÊËÌÍÏÐÑOÖ×ØÙÚÝÞßàâãå±²³´µ¶·¸¹»¼¾¿ÀÁÂÃÄÅÆ/g, 'xXÎWº~HMoVwÒÊËÌÍÏÐÑOÖ×ØÙÚÝÞßàâãå±²³´µ¶·¸¹»¼¾¿ÀÁÂÃÄÅÆA');

// 5. Change લ્ to Ã
content = content.replace(/'લ્': '.*',/, "'લ્': 'Ã',");
//Ã is already in the regex group because it's \u00c3.

// 6. Change reph below to \
content = content.replace(/'\\\\u0acd\\\\u0ab0': '\^',/, "'\\\\u0acd\\\\u0ab0': '\\\\',");

fs.writeFileSync('./src/utils/harikrishnaTemplate.js', content, 'utf8');

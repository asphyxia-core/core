import { readFileSync } from 'fs';

const codebook: {
  [key: string]: number;
} = {
  '"': 0,
  '1,': 1,
  'e': 2,
  't': 3,
  'a': 4,
  '2,': 5,
  'o': 6,
  '0,': 7,
  'i': 8,
  'n': 9,
  '\n': 10,
  'e"': 11,
  'r': 12,
  '\r': 13,
  '"t': 14,
  'in': 15,
  'he': 16,
  'th': 17,
  'h': 18,
  'he"': 19,
  'to': 20,
  's': 21,
  'l': 22,
  's"': 23,
  'd': 24,
  '"a': 25,
  'an': 26,
  'er': 27,
  'c': 28,
  '"o': 29,
  'd"': 30,
  'on': 31,
  '"of': 32,
  're': 33,
  'of"': 34,
  't"': 35,
  ',"': 36,
  'is': 37,
  'u': 38,
  'at': 39,
  '""': 40,
  'n"': 41,
  'or': 42,
  '3,': 43,
  'f': 44,
  'm': 45,
  'as': 46,
  'it': 47,
  '4,': 48,
  'a"': 49,
  'true': 50,
  'en': 51,
  '"refid"': 52,
  '"w': 53,
  'es': 54,
  '"an': 55,
  '"i': 56,
  '5,': 57,
  'f"': 58,
  'g': 59,
  'p': 60,
  'nd': 61,
  '"s': 62,
  'nd"': 63,
  'ed"': 64,
  'w': 65,
  'ed': 66,
  'false': 67,
  ']': 68,
  'te': 69,
  'ing': 70,
  'y"': 71,
  '_id': 72,
  '"c': 73,
  'ti': 74,
  'r"': 75,
  '6,': 76,
  'st': 77,
  '"in': 78,
  'ar': 79,
  'nt': 80,
  ',': 81,
  '"to': 82,
  'y': 83,
  'ng': 84,
  '"h': 85,
  '"}': 86,
  'le': 87,
  'al': 88,
  'to"': 89,
  'b': 90,
  'ou': 91,
  'be': 92,
  '}}': 93,
  '"b': 94,
  'se': 95,
  'o"': 96,
  'ent': 97,
  'ha': 98,
  'ng"': 99,
  '}}}': 100,
  'indexCreated': 101,
  'hi': 102,
  '[': 103,
  '"f': 104,
  'in"': 105,
  'de': 106,
  'ion': 107,
  'me': 108,
  'v': 109,
  '.': 110,
  've': 111,
  'all': 112,
  're"': 113,
  'ri': 114,
  'ro': 115,
  'is"': 116,
  'co': 117,
  '7,': 118,
  'are': 119,
  'ea': 120,
  '."': 121,
  'her': 122,
  '"m': 123,
  'er"': 124,
  '"p': 125,
  'es"': 126,
  'by': 127,
  'que': 128,
  'di': 129,
  'ra': 130,
  'ic': 131,
  'not': 132,
  's,"': 133,
  '8,': 134,
  'at"': 135,
  'ce': 136,
  'la': 137,
  'h"': 138,
  'ne': 139,
  'as"': 140,
  'tio': 141,
  'on"': 142,
  '9,': 143,
  'io': 144,
  'we': 145,
  '"a"': 146,
  'om': 147,
  ':9': 148,
  ':8': 149,
  'ur': 150,
  'li': 151,
  'll': 152,
  'ch': 153,
  ':7': 154,
  ':6': 155,
  ':5': 156,
  'g"': 157,
  'e",': 158,
  '"wh': 159,
  'ere': 160,
  '"co': 161,
  ':4': 162,
  'data': 163,
  'us': 164,
  '"d': 165,
  'ss': 166,
  '{}': 167,
  '","': 168,
  '="': 169,
  '"be': 170,
  '"e': 171,
  's a': 172,
  'ma': 173,
  'one': 174,
  ':3': 175,
  'or"': 176,
  'but': 177,
  'el': 178,
  'so': 179,
  'l"': 180,
  ':2': 181,
  's,': 182,
  'no': 183,
  'ter': 184,
  '"wa': 185,
  'iv': 186,
  'ho': 187,
  ':1': 188,
  '"r': 189,
  'hat': 190,
  ':0': 191,
  'ns': 192,
  'ch"': 193,
  'wh': 194,
  'tr': 195,
  'ut': 196,
  '/': 197,
  'have': 198,
  'ly"': 199,
  'ta': 200,
  '"ha': 201,
  '"on': 202,
  'tha': 203,
  '-': 204,
  '"l': 205,
  'ati': 206,
  'en"': 207,
  'pe': 208,
  '"re': 209,
  'there': 210,
  'ass': 211,
  'si': 212,
  '"fo': 213,
  'wa': 214,
  'ec': 215,
  'our': 216,
  'who': 217,
  'ser': 218,
  'z': 219,
  'fo': 220,
  'rs': 221,
  '>': 222,
  'ot': 223,
  'un': 224,
  '<': 225,
  'im': 226,
  'th"': 227,
  'nc': 228,
  'ate': 229,
  '><': 230,
  'ver': 231,
  'ad': 232,
  '"we': 233,
  'ly': 234,
  'ee': 235,
  '"n': 236,
  'id': 237,
  '"cl': 238,
  'ac': 239,
  'il': 240,
  '</': 241,
  'rt': 242,
  '"wi': 243,
  '":{': 244,
  'e,"': 245,
  '"it': 246,
  'whi': 247,
  '"ma': 248,
  'ge': 249,
  'x': 250,
  '":"': 251,
  '{"': 252,
  'info': 253,
};

const reverse_codebook = new Array(254);
for (const key in codebook) {
  reverse_codebook[codebook[key]] = key;
}

const flush_verbatim = function (verbatim: string) {
  let output = [];
  if (verbatim.length > 1) {
    output.push('\u00FF');
    output.push(String.fromCharCode(verbatim.length - 1));
  } else {
    output.push('\u00FE');
  }
  let k = 0;
  for (; k < verbatim.length; k++) {
    output.push(verbatim[k]);
  }

  return output;
};

export const compress = function (input: string) {
  var verbatim = '';
  var output: string[] = [];
  var input_index = 0;

  while (input_index < input.length) {
    // Try to lookup substrings into the hash table, starting from the
    // longer to the shorter substrings
    var encoded = false;
    var j = 7;

    if (input.length - input_index < 7) {
      j = input.length - input_index;
    }

    for (; j > 0; j--) {
      var code = codebook[input.substr(input_index, j)];
      if (code != undefined) {
        // Match found in the hash table,
        // Flush verbatim bytes if needed
        if (verbatim) {
          output = output.concat(flush_verbatim(verbatim));
          verbatim = '';
        }
        // Emit the byte
        output.push(String.fromCharCode(code));

        input_index += j;

        encoded = true;
        break;
      }
    }
    if (!encoded) {
      // Match not found - add the byte to the verbatim buffer
      verbatim += input[input_index];
      input_index++;

      // Flush if we reached the verbatim bytes length limit
      if (verbatim.length == 256) {
        output = output.concat(flush_verbatim(verbatim));
        verbatim = '';
      }
    }
  }

  // Flush verbatim bytes if needed
  if (verbatim) {
    output = output.concat(flush_verbatim(verbatim));
    verbatim = '';
  }

  return output.join('');
};

export const decompress = function (input: string) {
  var output = '';
  var i = 0;
  while (i < input.length) {
    if (input[i] === '\u00FE') {
      // Verbatim byte
      if (i + 1 >= input.length) {
        throw 'Malformed smaz.';
      }
      output += input[i + 1];
      i += 2;
    } else if (input[i] === '\u00FF') {
      // Verbatim string
      var j;
      if (i + input.charCodeAt(i + 1) + 2 >= input.length) {
        throw 'Malformed smaz.';
      }
      for (j = 0; j < input.charCodeAt(i + 1) + 1; j++) {
        output += input[i + 2 + j];
      }
      i += 3 + input.charCodeAt(i + 1);
    } else {
      // Codebook entry
      output += reverse_codebook[input.charCodeAt(i)];
      i++;
    }
  }

  return output;
};
try {
  if (process.argv[2] == 'compress') {
    console.log(compress(readFileSync(process.argv[3], { encoding: 'utf8' })));
  } else if (process.argv[2] == 'decompress') {
    console.log(decompress(readFileSync(process.argv[3], { encoding: 'utf8' })));
  }
} catch {
  console.error('operation failed');
}

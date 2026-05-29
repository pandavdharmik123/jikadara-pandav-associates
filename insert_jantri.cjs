const fs = require('fs');
let appContent = fs.readFileSync('src/App.jsx', 'utf8');

// Add import statement
const importStatement = "import JantriCalculator from './components/JantriCalculator';\n";
appContent = appContent.replace(
  "import { transliterateLatinRunsToGujarati } from './utils/batchTransliterate';",
  "import { transliterateLatinRunsToGujarati } from './utils/batchTransliterate';\n" + importStatement
);

// Add Tab
const tabInsert = `
            {
              key: 'jantri',
              label: (
                <span>
                  <CalculatorOutlined /> Jantri Calculator
                </span>
              ),
              children: (
                <JantriCalculator currentAccentColor={currentAccentColor} />
              )
            },
`;
appContent = appContent.replace(
  /              \),\n            \},\n          \]\}\n        \/>/g,
  "              ),\n            },\n" + tabInsert + "          ]}\n        />"
);

if (!appContent.includes('CalculatorOutlined')) {
  appContent = appContent.replace(
    /SwapRightOutlined\n\} from '@ant-design\/icons';/,
    "SwapRightOutlined,\n  CalculatorOutlined\n} from '@ant-design/icons';"
  );
}

fs.writeFileSync('src/App.jsx', appContent, 'utf8');
console.log('Jantri tab added!');

const fs = require('fs');
const { XMLParser, XMLValidator } = require('fast-xml-parser');
let xml = fs.readFileSync('app/vendordoclines/webapp/view/GRWorkbench.view.xml', 'utf8');

const result = XMLValidator.validate(xml);
if (result === true) {
    console.log("XML is VALID");
} else {
    console.log("XML ERROR:", result.err);
}

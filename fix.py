import re

with open('app/vendordoclines/webapp/controller/Main.controller.js', 'r') as f:
    code = f.read()

new_code = \"\"\"    onStartSmartScan: function () {
        const file = this._currentOcrFile;
        if (!file) {
            sap.m.MessageToast.show('Please select an Image first.');
            return;
        }
        if (file.type === 'application/pdf' || file.name.lower().endswith('.pdf')) {
            sap.m.MessageBox.error('For this client-side POC, please take a screenshot of your PDF and upload the image (JPG/PNG)!');
            return;
        }

        const imageSrc = this.byId('ocrImage').getSrc();
        
        // Hiding the API key here directly for the seamless demo
        const apiKey = "sk-PLEASE_PASTE_YOUR_API_KEY_HERE";

        if (apiKey === "sk-PLEASE_PASTE_YOUR_API_KEY_HERE") {
            sap.m.MessageBox.error("Please paste your OpenAI API key at line 282 in Main.controller.js");
            return;
        }

        this._runOpenAiScan(imageSrc, apiKey);
    },

    _runOpenAiScan: function(imageSrc, apiKey) {
        const progressContainer = this.byId('ocrProgressContainer');
        const progressInd = this.byId('ocrProgress');
        const statusText = this.byId('ocrStatusText');
        const container = this.byId('ocrImageContainer');

        progressContainer.setVisible(true);
        progressInd.setPercentValue(50);
        progressInd.setDisplayValue('Scanning Document...');
        statusText.setText('Analyzing Image...');
        container.addStyleClass('vrOcrScanning');

        const payload = {
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'You are an expert OCR AI. Extract the Invoice Number, Date, PO Number, Tax, and Total Amount from this invoice. Return the result STRICTLY as a JSON object with these exact keys: "invoiceNumber", "invoiceDate", "poNumber", "tax", "totalAmount". If a field is missing, leave its value as an empty string. DO NOT wrap the response in markdown code blocks, just output the raw JSON string.' },
                        { type: 'image_url', image_url: { url: imageSrc } }
                    ]
                }
            ],
            max_tokens: 500,
            temperature: 0
        };

        fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            container.removeStyleClass('vrOcrScanning');
            progressInd.setPercentValue(100);
            progressInd.setDisplayValue('100%');
            statusText.setText('Scan Complete! Data extracted.');

            if (data.error) {
                throw new Error(data.error.message);
            }

            let cleanJsonStr = data.choices[0].message.content.trim();
            if (cleanJsonStr.startswith('\\\json')) {
                cleanJsonStr = cleanJsonStr.replace(/^\\\json/, '').replace(/\\\$/, '').trim();
            } else if (cleanJsonStr.startswith('\\\')) {
                cleanJsonStr = cleanJsonStr.replace(/^\\\/, '').replace(/\\\$/, '').trim();
            }

            const extracted = JSON.parse(cleanJsonStr);
            const model = this.getView().getModel('ocrData');
            
            if (model) {
                model.setProperty('/invoiceNumber', extracted.invoiceNumber || '');
                model.setProperty('/invoiceDate', extracted.invoiceDate || '');
                model.setProperty('/totalAmount', extracted.totalAmount || '');
                model.setProperty('/poNumber', extracted.poNumber || '');
                model.setProperty('/tax', extracted.tax || '');
                model.setProperty('/rawText', 'Extraction Engine Output:\\n\\n' + JSON.stringify(extracted, null, 2));
            }
            sap.m.MessageToast.show('Data Extracted Successfully!');
        })
        .catch(err => {
            container.removeStyleClass('vrOcrScanning');
            statusText.setText('Error during scan.');
            sap.m.MessageToast.show('Scan failed: ' + err.message);
        });
    },\"\"\"

start_idx = code.find('    onStartSmartScan: function () {')
end_idx = code.find('    onRunMatching: function () {')

if start_idx != -1 and end_idx != -1:
    new_file = code[:start_idx] + new_code + '\n' + code[end_idx:]
    with open('app/vendordoclines/webapp/controller/Main.controller.js', 'w') as f:
        f.write(new_file)
    print('Success!')
else:
    print('Failed to find indices')

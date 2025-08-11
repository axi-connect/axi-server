import path from 'node:path';
import { google } from "googleapis";
import { fileURLToPath } from 'node:url';

export class GoogleSheetsRepository{
    private auth;
    private googleSheets;
    private spreadsheetId:string = '1tKq8FLliqm2AjUqiGyQ0uec78wiFnjAYne298Z8NkkI'

    constructor(){
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const keyFilePath = path.resolve(__dirname, './credentials.json');

        this.auth = new google.auth.GoogleAuth({
            keyFile: keyFilePath,
            scopes: "https://www.googleapis.com/auth/spreadsheets"
        });
        
        this.googleSheets = google.sheets({version: 'v4', auth: this.auth})
    }

    private async getClient(){
        return await this.auth.getClient();
    }

    async getMetaDataDocument(){
        return await this.googleSheets.spreadsheets.get({
            auth: this.auth,
            spreadsheetId: this.spreadsheetId
        })
    }

    async getSpreadsheet(){
        return await this.googleSheets.spreadsheets.get({
            auth: this.auth,
            spreadsheetId: this.spreadsheetId
        });
    }

    async getDataSpreadsheet(sheet:string){

        const rows = await this.googleSheets.spreadsheets.values.get({
            auth: this.auth,
            spreadsheetId: this.spreadsheetId,
            range: sheet
        });

        return rows.data;
    }

    async createSpreadsheet(sheet:string, headers?:string[]){
        const response = await this.googleSheets.spreadsheets.batchUpdate({
            auth: this.auth,
            spreadsheetId: this.spreadsheetId,
            requestBody: {

                requests: [{
                    addSheet: {
                        properties: { title: sheet }
                    }
                }]
            }
        });



        if(headers){
            const sheetId = response.data.replies?.[0]?.addSheet?.properties?.sheetId;

            await this.googleSheets.spreadsheets.values.update({
                auth: this.auth,
                spreadsheetId: this.spreadsheetId,
                range: `${sheet}!A1`,
                valueInputOption: 'USER_ENTERED',
    
                requestBody: {
                    values: [headers]
                }
            });

            await this.googleSheets.spreadsheets.batchUpdate({
                auth: this.auth,
                spreadsheetId: this.spreadsheetId,
                requestBody: {
                    requests: [{
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: 0,  // Primera fila
                                endRowIndex: 1,    // Solo una fila
                                startColumnIndex: 0,
                                endColumnIndex: headers.length // Cantidad de columnas
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.0, green: 0.5, blue: 1.0 }, // Fondo azul
                                    textFormat: {
                                        bold: true, // Negrita
                                        foregroundColor: { red: 1, green: 1, blue: 1 } // Texto blanco
                                    },
                                    horizontalAlignment: "CENTER" // Alineado al centro
                                }
                            },
                            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
                        }
                    }]
                }
            });
        }

        console.log(`Hoja "${sheet}" creada exitosamente.`);
    }

    async setDataSpreadsheet(sheet:string, data:string[]){
        return await this.googleSheets.spreadsheets.values.append({
            auth: this.auth,
            spreadsheetId: this.spreadsheetId,
            range: sheet,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [data]
            }
        })
    }
}
// The module 'vscode' contains the VS Code extensibility API
// Import the necessary extensibility types to use in your code below
import {window, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, Uri, Range, commands} from 'vscode';

// This method is called when your extension is activated. Activation is
// controlled by the activation events defined in package.json.
export function activate(context: ExtensionContext) {
    let charCodeDisplay = new CharCodeDisplay();
    let controller = new CharCodeController(charCodeDisplay);

    // Add to a list of disposables which are disposed when this extension is deactivated.
    context.subscriptions.push(controller);
    context.subscriptions.push(charCodeDisplay);

    commands.registerCommand('cursorCharCode.openUnicodeInfo', () => {
        commands.executeCommand('vscode.open', Uri.parse(`https://unicode-table.com/en/${charCodeDisplay._hexCode}`));
    });
}

class CharCodeDisplay {
    private _statusBarItem: StatusBarItem;
    public _hexCode: String;

    public updateCharacterCode() {
        if( !this._statusBarItem ) {
            this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        }

        // Get the current text editor
        let editor = window.activeTextEditor;
        if( !editor || !editor.selection || !editor.document ) {
            this._statusBarItem.hide();
            return;
        }

        let cursorPos = editor.selection.active;
        // taking 2 chars instead of one allows to handle surrogate pairs correctly
        let cursorTextRange = new Range(cursorPos, cursorPos.translate(0, 2));
        let cursorText = editor.document.getText( cursorTextRange );
        if( !cursorText ) {
            this._statusBarItem.hide();
            return;
        }

        // Update the status bar
        let charAsNumber = cursorText.codePointAt( 0 );
        if( !charAsNumber ) {
            this._statusBarItem.hide();
            return;
        }

        let hexCode = charAsNumber.toString( 16 ).toUpperCase();
        if( charAsNumber <= 0xffff && hexCode.length < 4 ) {
            let zeroesToAdd = 4 - hexCode.length;
            hexCode = '0'.repeat( zeroesToAdd ) + hexCode;
        }
        //console.log( `Text: ${cursorText}, number: ${charAsNumber}, hex=${hexCode}` );

        this._statusBarItem.text = `$(telescope) U+${hexCode}`;
        this._hexCode = `${hexCode}`;
        this._statusBarItem.command = 'cursorCharCode.openUnicodeInfo';
        this._statusBarItem.show();
    }

    dispose() {
        this._statusBarItem.dispose();
    }
}

class CharCodeController {
    private _display: CharCodeDisplay;
    private _disposable: Disposable;

    constructor(display: CharCodeDisplay) {
        this._display = display;

        // subscribe to selection change and editor activation events
        let subscriptions: Disposable[] = [];
        window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
        window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

        this._display.updateCharacterCode();
        this._disposable = Disposable.from(...subscriptions);
    }

    dispose() {
        this._disposable.dispose();
    }

    private _onEvent() {
        this._display.updateCharacterCode();
    }
}
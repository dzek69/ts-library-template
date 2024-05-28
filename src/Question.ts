import readline from "readline";

class Question {
    private _cli: readline.Interface | null = null;

    private _createIfNeeded() {
        if (!this._cli) {
            this._cli = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
        }
    }

    public async ask(question: string, def = ""): Promise<string> {
        this._createIfNeeded();
        return new Promise(resolve => {
            this._cli!.question(question + " ", nname => {
                resolve(nname.trim() || def);
            });
        });
    }

    public close() {
        if (this._cli) {
            this._cli.close();
            this._cli = null;
        }
    }
}

export { Question };

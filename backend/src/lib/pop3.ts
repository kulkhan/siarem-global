import * as tls from 'tls';
import * as net from 'net';

export class Pop3Client {
  private socket: tls.TLSSocket | net.Socket | null = null;
  private buffer = '';
  private waiters: Array<(line: string) => void> = [];
  private lines: string[] = [];

  private onData(chunk: Buffer | string) {
    this.buffer += chunk.toString('utf8');
    const parts = this.buffer.split('\r\n');
    this.buffer = parts.pop()!;
    for (const line of parts) {
      if (this.waiters.length > 0) {
        this.waiters.shift()!(line);
      } else {
        this.lines.push(line);
      }
    }
  }

  private readLine(): Promise<string> {
    if (this.lines.length > 0) return Promise.resolve(this.lines.shift()!);
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  private async assertOk(): Promise<string> {
    const line = await this.readLine();
    if (!line.startsWith('+OK')) throw new Error(`POP3 error: ${line}`);
    return line;
  }

  private async readMultiLine(): Promise<string[]> {
    const result: string[] = [];
    while (true) {
      const line = await this.readLine();
      if (line === '.') break;
      result.push(line.startsWith('..') ? line.slice(1) : line);
    }
    return result;
  }

  connect(host: string, port: number, useTls: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      const attach = (sock: tls.TLSSocket | net.Socket) => {
        this.socket = sock;
        sock.on('data', (c) => this.onData(c));
        sock.on('error', (err) => {
          const w = this.waiters.shift();
          if (w) w(`-ERR ${err.message}`);
          reject(err);
        });
      };

      if (useTls) {
        const sock = tls.connect(port, host, { rejectUnauthorized: false }, () => {
          attach(sock);
          this.assertOk().then(() => resolve()).catch(reject);
        });
        sock.on('error', reject);
      } else {
        const sock = net.connect(port, host, () => {
          attach(sock);
          this.assertOk().then(() => resolve()).catch(reject);
        });
        sock.on('error', reject);
      }
    });
  }

  async login(user: string, pass: string): Promise<void> {
    this.socket!.write(`USER ${user}\r\n`);
    await this.assertOk();
    this.socket!.write(`PASS ${pass}\r\n`);
    await this.assertOk();
  }

  async uidl(): Promise<Record<number, string>> {
    this.socket!.write('UIDL\r\n');
    await this.assertOk();
    const lines = await this.readMultiLine();
    const map: Record<number, string> = {};
    for (const line of lines) {
      const [num, uid] = line.split(' ');
      if (num && uid) map[parseInt(num, 10)] = uid;
    }
    return map;
  }

  async retr(msgNum: number): Promise<string> {
    this.socket!.write(`RETR ${msgNum}\r\n`);
    await this.assertOk();
    const lines = await this.readMultiLine();
    return lines.join('\r\n');
  }

  async dele(msgNum: number): Promise<void> {
    this.socket!.write(`DELE ${msgNum}\r\n`);
    await this.assertOk();
  }

  async quit(): Promise<void> {
    try {
      this.socket!.write('QUIT\r\n');
      await this.readLine().catch(() => {});
    } finally {
      this.socket?.destroy();
      this.socket = null;
    }
  }
}

export function parseEmail(raw: string): { subject: string; from: string; body: string } {
  const lines = raw.split(/\r?\n/);
  let subject = '';
  let from = '';
  let bodyStart = lines.length;
  let inHeader = true;
  let i = 0;

  while (i < lines.length && inHeader) {
    const line = lines[i];
    if (line === '') {
      bodyStart = i + 1;
      inHeader = false;
    } else if (/^subject:/i.test(line)) {
      subject = line.slice(8).trim();
    } else if (/^from:/i.test(line)) {
      from = line.slice(5).trim();
    }
    i++;
  }

  const body = lines.slice(bodyStart).join('\n').replace(/=\r?\n/g, '').trim();
  return { subject, from, body };
}

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Trash2, Code2, Terminal, Info, ChevronRight, Copy, Check, Settings2 } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-java';
import 'prismjs/themes/prism-tomorrow.css';

const LANGUAGES = [
    {
        id: 'javascript',
        name: 'JavaScript',
        icon: 'JS',
        prism: languages.js,
        piston: 'javascript',
        version: '18.15.0',
        defaultCode: `// Welcome to Nexus Playground!
function greet(name) {
  return "Hello, " + name + "!";
}

console.log(greet("Student"));

const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);
console.log("Sum of numbers:", sum);`
    },
    {
        id: 'python',
        name: 'Python',
        icon: 'PY',
        prism: languages.python,
        piston: 'python',
        version: '3.10.0',
        defaultCode: `# Welcome to Nexus Playground!
def greet(name):
    return f"Hello, {name}!"

print(greet("Student"))

numbers = [1, 2, 3, 4, 5]
total = sum(numbers)
print(f"Sum of numbers: {total}")`
    },
    {
        id: 'c',
        name: 'C',
        icon: 'C',
        prism: languages.c,
        piston: 'c',
        version: '10.2.1',
        defaultCode: `#include <stdio.h>

int main() {
    printf("Hello, Student!\\n");
    
    int numbers[] = {1, 2, 3, 4, 5};
    int sum = 0;
    for(int i = 0; i < 5; i++) {
        sum += numbers[i];
    }
    printf("Sum of numbers: %d\\n", sum);
    
    return 0;
}`
    },
    {
        id: 'java',
        name: 'Java',
        icon: 'JAVA',
        prism: languages.java,
        piston: 'java',
        version: '15.0.2',
        defaultCode: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Student!");
        
        int[] numbers = {1, 2, 3, 4, 5};
        int sum = 0;
        for(int num : numbers) {
            sum += num;
        }
        System.out.println("Sum of numbers: " + sum);
    }
}`
    }
];

export const CodePlayground = () => {
    const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
    const [code, setCode] = useState(selectedLang.defaultCode);
    const [stdin, setStdin] = useState('');
    const [output, setOutput] = useState<string[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const [copied, setCopied] = useState(false);
    const outputEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [output]);

    const handleLanguageChange = (langId: string) => {
        const lang = LANGUAGES.find(l => l.id === langId);
        if (lang) {
            setSelectedLang(lang);
            setCode(lang.defaultCode);
            setOutput([]);
        }
    };

    const runCode = async () => {
        setIsExecuting(true);
        setOutput(['🚀 Initializing execution environment...']);

        try {
            if (selectedLang.id === 'javascript') {
                // Local JavaScript Execution
                const logs: string[] = [];
                const originalLog = console.log;
                const originalError = console.error;
                const originalPrompt = window.prompt;

                let stdinLines = stdin.split('\n');
                let stdinIndex = 0;

                console.log = (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
                console.error = (...args) => logs.push(`❌ ${args.join(' ')}`);
                window.prompt = (msg) => {
                    if (msg) logs.push(`[Prompt]: ${msg}`);
                    return stdinLines[stdinIndex++] || null;
                };

                try {
                    const fn = new Function(code);
                    fn();
                    if (logs.length === 0) logs.push('✅ Execution finished (no output).');
                } catch (err: any) {
                    logs.push(`❌ Runtime Error: ${err.message}`);
                } finally {
                    console.log = originalLog;
                    console.error = originalError;
                    window.prompt = originalPrompt;
                    setOutput(logs);
                }
            } else if (selectedLang.id === 'python') {
                // Python Execution via Pyodide (WASM)
                setOutput(['🚀 Loading Python environment (WASM)...']);

                if (!(window as any).loadPyodide) {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
                    document.head.appendChild(script);
                    await new Promise((resolve) => { script.onload = resolve; });
                }

                const pyodide = await (window as any).loadPyodide();

                // Capture stdout and handle stdin
                const logs: string[] = [];
                pyodide.setStdout({
                    batched: (str: string) => logs.push(str)
                });

                // Mock stdin for Python input()
                let stdinLines = stdin.split('\n');
                let stdinIndex = 0;
                pyodide.setStdin({
                    stdin: () => stdinLines[stdinIndex++] || ''
                });

                try {
                    await pyodide.runPythonAsync(code);
                    if (logs.length === 0) logs.push('✅ Execution finished (no output).');
                    setOutput(logs);
                } catch (err: any) {
                    setOutput([`❌ Python Error: ${err.message}`]);
                }
            } else {
                // C and Java use Piston with stdin support
                setOutput(['🚀 Connecting to Nexus Cloud Compiler...']);

                const response = await fetch('https://piston.riddle.host/api/v2/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        language: selectedLang.piston,
                        version: selectedLang.version,
                        stdin: stdin,
                        files: [{
                            name: selectedLang.id === 'java' ? 'Main.java' : 'main.c',
                            content: code,
                        }],
                    }),
                });

                const data = await response.json();

                if (data.run) {
                    const logs: string[] = [];
                    if (data.run.stdout) logs.push(...data.run.stdout.split('\n').filter((l: string) => l !== ''));
                    if (data.run.stderr) logs.push(...data.run.stderr.split('\n').filter((l: string) => l !== '').map((l: string) => `❌ ${l}`));
                    if (logs.length === 0 && data.run.code === 0) logs.push('✅ Execution finished.');
                    setOutput(logs);
                } else {
                    setOutput([
                        '❌ Cloud Compiler Error',
                        'The public Piston API is currently restricted.',
                        'Python and JavaScript are running locally (WASM).',
                        'For C/Java, please contact the administrator to whitelist this domain.'
                    ]);
                }
            }
        } catch (err: any) {
            setOutput([`❌ Execution Error: ${err.message}`]);
        } finally {
            setIsExecuting(false);
        }
    };

    const clearOutput = () => setOutput([]);

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-5xl font-bold tracking-tight">
                            Nexus <span className="text-neonBlue">Playground</span>
                        </h1>
                        <p className="text-gray-400 mt-2 text-lg">Multi-language compiler for modern students.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                            {LANGUAGES.map(lang => (
                                <button
                                    key={lang.id}
                                    onClick={() => handleLanguageChange(lang.id)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedLang.id === lang.id
                                            ? 'bg-neonBlue text-black'
                                            : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {lang.icon}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={copyCode}
                            className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                            title="Copy Code"
                        >
                            {copied ? <Check className="w-5 h-5 text-neonGreen" /> : <Copy className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={runCode}
                            disabled={isExecuting}
                            className="flex items-center gap-2 bg-neonBlue text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105 shadow-[0_0_30px_rgba(0,212,255,0.3)] disabled:opacity-50 disabled:scale-100"
                        >
                            {isExecuting ? (
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Play className="w-5 h-5 fill-current" />
                            )}
                            Run Code
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 h-[650px]">
                {/* Editor Section */}
                <div className="flex flex-col bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="px-8 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <div className="flex items-center gap-2">
                            <Code2 className="w-4 h-4 text-neonBlue" />
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-gray-400">
                                Editor ({selectedLang.name})
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                            <Settings2 className="w-3 h-3" />
                            v{selectedLang.version}
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar flex bg-black/20">
                        {/* Line Numbers */}
                        <div className="py-[20px] pl-4 pr-3 text-right select-none border-r border-white/5 bg-white/[0.02] min-w-[3.5rem]">
                            {code.split('\n').map((_, i) => (
                                <div key={i} className="text-[14px] font-mono text-gray-500 leading-[21px] h-[21px]">
                                    {i + 1}
                                </div>
                            ))}
                        </div>
                        {/* Editor */}
                        <div className="flex-1 font-mono text-sm relative">
                            <Editor
                                value={code}
                                onValueChange={code => setCode(code)}
                                highlight={code => highlight(code, selectedLang.prism, selectedLang.id)}
                                padding={20}
                                style={{
                                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                    fontSize: 14,
                                    lineHeight: '21px',
                                    minHeight: '100%',
                                    backgroundColor: 'transparent',
                                }}
                                className="outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Console & Input Section */}
                <div className="flex flex-col gap-8 h-full">
                    {/* Input Section */}
                    <div className="flex flex-col bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl h-1/3">
                        <div className="px-8 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-2">
                                <Settings2 className="w-4 h-4 text-neonBlue" />
                                <span className="text-xs font-mono font-bold uppercase tracking-widest text-gray-400">Program Input (stdin)</span>
                            </div>
                        </div>
                        <textarea
                            value={stdin}
                            onChange={(e) => setStdin(e.target.value)}
                            placeholder="Enter input for your program here..."
                            className="flex-1 bg-black/40 p-6 font-mono text-sm text-gray-300 outline-none resize-none custom-scrollbar placeholder:text-gray-700"
                        />
                    </div>

                    {/* Console Section */}
                    <div className="flex flex-col bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex-1">
                        <div className="px-8 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-neonGreen" />
                                <span className="text-xs font-mono font-bold uppercase tracking-widest text-gray-400">Console Output</span>
                            </div>
                            <button
                                onClick={clearOutput}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-500 hover:text-red-400"
                                title="Clear Console"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar p-8 font-mono text-sm bg-black/40">
                            {output.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4 opacity-50">
                                    <Terminal className="w-12 h-12" />
                                    <p>Run your code to see output here.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {output.map((line, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`flex gap-3 py-1 border-b border-white/5 last:border-0 ${line.startsWith('❌') ? 'text-red-400' :
                                                    line.startsWith('⚠️') ? 'text-orange-400' :
                                                        line.startsWith('🚀') ? 'text-neonBlue italic' :
                                                            line.startsWith('✅') ? 'text-neonGreen' :
                                                                'text-gray-300'
                                                }`}
                                        >
                                            <pre className="whitespace-pre-wrap break-all">{line}</pre>
                                        </motion.div>
                                    ))}
                                    <div ref={outputEndRef} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tips Section */}
            <div className="p-8 rounded-[2.5rem] bg-indigo-600/5 border border-indigo-600/10">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-600/10 rounded-2xl">
                        <Info className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-2">Nexus Compiler Tips</h3>
                        <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-400">
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2">
                                    <ChevronRight className="w-4 h-4 text-neonBlue" />
                                    Supports <strong>JavaScript</strong>, <strong>Python</strong>, <strong>C</strong>, and <strong>Java</strong>.
                                </li>
                                <li className="flex items-center gap-2">
                                    <ChevronRight className="w-4 h-4 text-neonBlue" />
                                    Execution is handled via a secure remote environment.
                                </li>
                            </ul>
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2">
                                    <ChevronRight className="w-4 h-4 text-neonBlue" />
                                    Use the <strong>Program Input</strong> box for <code>input()</code> or <code>scanf()</code>.
                                </li>
                                <li className="flex items-center gap-2">
                                    <ChevronRight className="w-4 h-4 text-neonBlue" />
                                    Ask the AI Tutor if you need help debugging your code!
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


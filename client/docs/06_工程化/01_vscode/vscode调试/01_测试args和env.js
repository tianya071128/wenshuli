const { argv, env } = require('process');

[
  'D:\\node\\node.exe',
  'c:\\Users\\Administrator\\Desktop\\wenshuli\\client\\docs\\06_工程化\\01_vscode\\vscode调试\\01_测试args.js',
  'Administrator',
  'test',
];
// 前面两个是 node 程序添加的，后面是通过 launch.json 的 args 属性添加的（原理就是通过 D:\node\node.exe .\client\docs\06_工程化\01_vscode\vscode调试\01_测试args.js Administrator test 命令添加的）
console.log(argv);

({
  ALLUSERSPROFILE: 'C:\\ProgramData',
  APPDATA: 'C:\\Users\\Administrator\\AppData\\Roaming',
  BASE_URL: 'URL', // 在 launch.json 的 env 属性配置的，其他的是 Node 自带的或 VSCODE 配置的
  CHROME_CRASHPAD_PIPE_NAME: '\\\\.\\pipe\\crashpad_2612_LLAEYYVTEKMKIJMK',
  // ...
});
console.log(env);

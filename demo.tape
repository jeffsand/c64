Output demo.gif

Set Shell "bash"
Set FontSize 15
Set Width 800
Set Height 380
Set Theme "Catppuccin Mocha"
Set Padding 16
Set TypingSpeed 40ms

Type "c64 info"
Enter
Sleep 3s

Type "c64 mount fixtures/paradroid.d64"
Enter
Sleep 3.5s

Type "c64 type 'POKE 53280,0'"
Enter
Sleep 2s

Type "c64 disk create --name SAVE-01"
Enter
Sleep 2s

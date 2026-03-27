Output demo.gif

Set Shell "bash"
Set FontSize 16
Set Width 900
Set Height 500
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 50ms

Type "# Command your C64 Ultimate from the terminal"
Enter
Sleep 1s

Type "c64 --version"
Enter
Sleep 1.5s

Type "# Find your device on the network"
Enter
Sleep 500ms

Type "c64 config set device.host 192.168.1.42"
Enter
Sleep 1.5s

Type "# Check device status"
Enter
Sleep 500ms

Type "c64 info"
Enter
Sleep 3s

Type "# Mount a disk image (uploads from your Mac)"
Enter
Sleep 500ms

Type "c64 mount fixtures/paradroid.d64"
Enter
Sleep 4s

Type "# Run a cartridge"
Enter
Sleep 500ms

Type "c64 run fixtures/Badlands.crt"
Enter
Sleep 4s

Type "# Type on the C64 keyboard"
Enter
Sleep 500ms

Type "c64 type 'POKE 53280,0'"
Enter
Sleep 2s

Type "# Create a data disk"
Enter
Sleep 500ms

Type "c64 disk create --name SAVE-01"
Enter
Sleep 2s

Type "c64 disk list"
Enter
Sleep 2s

Type "# JSON output for scripting and agents"
Enter
Sleep 500ms

Type "c64 info --json"
Enter
Sleep 3s

Type "# That's c64. npm install -g @jeffsand/c64"
Enter
Sleep 3s

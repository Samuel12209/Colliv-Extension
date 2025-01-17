## Colliv Vscode Extension
  ![Typescript](https://img.shields.io/badge/TypeScript-3178C6.svg?style=for-the-badge&logo=TypeScript&logoColor=white)

  ![Vscode](https://img.shields.io/badge/VSCodium-2F80ED.svg?style=for-the-badge&logo=VSCodium&logoColor=white)

### Made for Collaberating Live with others

  ![Demo Screenshot](https://github.com/Samuel12209/Colliv-Extension/blob/main/Assets/demo_pic.png)
### Added So far:

- **Initial release** of the Colliv extension for Visual Studio Code.
- **File syncing** between host and client sessions.
- **Real-time file updates** during an active session.
- Command to **start a server** (host session).
- Command to **join a session** as a client.
- Command to **stop hosting** and **leave a session**.
- **File change detection** implemented, ensuring changes made by the host are reflected instantly on the client side.

### How to Use
1. **Start the server** (host a session) using the `colliv.startServer` command.
2. **Join a session** as a client using the `colliv.joinSession` command.

   Use the default port 5000

   ![default port](https://github.com/Samuel12209/Colliv-Extension/blob/main/Assets/default_port_demo.png)

   Use the default Ip 127.0.0.1

   ![default_ip](https://github.com/Samuel12209/Colliv-Extension/blob/main/Assets/default_ip_demo.png)
4. **Sync and edit files** in real-time between the host and client.



### IMPORTANT NOTES 📢
- This version currently only works on LOCAL or aka WAN (Same network). 
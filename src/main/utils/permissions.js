import sudoPrompt from 'sudo-prompt';
import fs from 'fs';
import { getInputDevicePath } from '../Helpers/getInputPorts';



function checkPermissions (filePath){
    return new Promise ((resolve) => {
        fs.stat(filePath, (err, stats) => {
            if (err) {
                return resolve(false);
            }

            const hasPermissions = (stats.mode & 0o004) === 0o004
            resolve(hasPermissions)
        })
    })
}

export async function giveInputDevicePermissionLinux(){

    console.log('Checking permissions for input devices...')
    try{
        const mouseFile = '/dev/input/mice'
        const keyboardFile = getInputDevicePath()

        const [mousePermission, keyboardPermission] = await Promise.all([
            checkPermissions(mouseFile),
            checkPermissions(keyboardFile),
        ])

        let commands = []
        if(!mousePermission){
            commands.push(`chmod a+r ${mouseFile}`)
        }
        if(!keyboardPermission){
            commands.push(`chmod a+r ${keyboardFile}`)
        }
        if(commands.length > 0){
            const command = commands.join('&&')
            sudoPrompt.exec(command, { name: 'ElectronStopwatch'}, (error, stdout, stder )=> {
                if(error){
                    console.error('Error', error)
                    return 
                }
                if(stder){
                    console.error('Stderr', stder)
                    return
                }
            })
        }
    }catch (error){
        console.error('Error giving permissions', error)
    }
}
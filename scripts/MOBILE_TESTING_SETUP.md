# Mobile Testing Setup Guide

## Overview
This guide provides a complete setup for testing the Agent Agent AI application on mobile devices using your local network.

## Prerequisites
- Both frontend and backend code are up to date
- Your computer and mobile device are on the same WiFi network
- Windows Firewall allows the applications (will prompt if needed)

## Quick Start

### Step 1: Start Backend (Terminal 1)
```bash
cd backend-spring/scripts
run-network.bat
```

Expected output:
```
✓ Build successful
Application will be available at:
  Local:  http://localhost:8080
  Network: http://192.168.x.x:8080
```

### Step 2: Start Frontend (Terminal 2)
```bash
cd reactagent-frontend/scripts
test-frontend-network.bat
```

Expected output:
```
✓ Dependencies installed
Local IP address: 192.168.x.x
Frontend will be available at:
  Local:  http://localhost:5173
  Network: http://192.168.x.x:5173
```

### Step 3: Test from Mobile
1. Open mobile browser
2. Navigate to: `http://YOUR_IP:5173`
3. Send a test message
4. Verify AI response

## Available Scripts

### Backend Scripts
| Script | Purpose | Use Case |
|--------|---------|----------|
| `run-network.bat` | Start backend with network access | First time setup |
| `restart-network.bat` | Restart backend with network access | After code changes |
| `test-network.bat` | Test network connectivity | Verify backend is accessible |

### Frontend Scripts
| Script | Purpose | Use Case |
|--------|---------|----------|
| `test-frontend-network.bat` | Start frontend with network access | Windows |
| `test-frontend-network.sh` | Start frontend with network access | Unix/Linux/Mac |

## Detailed Setup Instructions

### Backend Setup

#### 1. Navigate to Backend Directory
```bash
cd backend-spring/scripts
```

#### 2. Start Backend with Network Access
```bash
run-network.bat
```

#### 3. Verify Backend is Running
```bash
# In another terminal
test-network.bat
```

Expected output:
```
✓ Application is running on port 8080
✓ Localhost access: OK
✓ Network access: OK
```

### Frontend Setup

#### 1. Navigate to Frontend Directory
```bash
cd reactagent-frontend/scripts
```

#### 2. Start Frontend with Network Access
```bash
# Windows
test-frontend-network.bat

# Unix/Linux/Mac
./test-frontend-network.sh
```

#### 3. Verify Frontend is Running
- Check terminal output for network URL
- Open browser on computer: `http://localhost:5173`
- Should see the chat interface

## Mobile Testing

### Access from Mobile Device

#### 1. Find Your Computer's IP Address
The scripts will display this, or run:
```bash
# Windows
ipconfig

# Look for "IPv4 Address" (usually 192.168.x.x)
```

#### 2. Access Frontend
- Open mobile browser
- Go to: `http://YOUR_IP:5173`
- Example: `http://192.168.1.100:5173`

#### 3. Test Functionality
- [ ] Frontend loads correctly
- [ ] Send a test message
- [ ] Receive AI response
- [ ] Check mobile layout
- [ ] Test mobile menu
- [ ] Verify settings work

### Troubleshooting Mobile Access

#### Frontend Won't Load
- **Check IP address**: Verify you're using the correct IP
- **Same network**: Ensure both devices are on same WiFi
- **Port 5173**: Verify frontend is running and accessible

#### API Calls Fail
- **Check console**: Look for API URL detection logs
- **Backend running**: Verify backend is accessible at `http://YOUR_IP:8080/health`
- **Firewall**: Allow Node.js/Vite through Windows Firewall

#### Wrong API URL
The frontend should automatically detect the correct backend URL. Check browser console for:
```
Frontend URL: http://192.168.x.x:5173/
Frontend hostname: 192.168.x.x
API Base URL: http://192.168.x.x:8080
```

## Testing Checklist

### Backend Testing
- [ ] Backend starts without errors
- [ ] Network test passes (`test-network.bat`)
- [ ] Accessible at `http://YOUR_IP:8080/health`
- [ ] Returns JSON response

### Frontend Testing
- [ ] Frontend starts without errors
- [ ] Accessible at `http://YOUR_IP:5173`
- [ ] Chat interface loads
- [ ] No console errors

### Mobile Testing
- [ ] Frontend loads on mobile
- [ ] API calls work (send/receive messages)
- [ ] Mobile layout is responsive
- [ ] Mobile menu functions
- [ ] Settings persist correctly
- [ ] Token display works (only for AI messages)

## Security Notes

### Development Only
- These scripts are for **development/testing only**
- Never use network mode in production
- Only use on trusted networks

### Firewall Settings
- Windows Firewall may ask for permission
- Allow Java/Spring Boot applications
- Allow Node.js/Vite applications

## Environment Variables

### Backend (Auto-set by scripts)
- `GOOGLE_CLOUD_PROJECT=reactagent-469214`
- `VERTEX_AI_LOCATION=us-central1`
- `VERTEX_AI_MODEL=gemini-1.5-flash`

### Frontend (Optional override)
- `VITE_API_BASE=http://YOUR_IP:8080` (if auto-detection fails)

## Common Issues

### Port Already in Use
- Kill existing processes or change ports
- Backend: `taskkill /F /IM java.exe`
- Frontend: Kill Node.js processes

### Network Access Fails
- Check Windows Firewall settings
- Verify both devices on same network
- Test with `ping` command

### API URL Detection Fails
- Check browser console for detection logs
- Manually set `VITE_API_BASE` environment variable
- Verify frontend and backend IP addresses match

## Performance Tips

### For Better Mobile Testing
- Use Chrome DevTools device emulation for initial testing
- Test on actual devices for final verification
- Check network tab for API call details
- Monitor console for errors and warnings

### Development Workflow
1. Make code changes
2. Backend: `restart-network.bat`
3. Frontend: Restart with `test-frontend-network.bat`
4. Test on mobile immediately

import { createSlice } from '@reduxjs/toolkit'
import { jwtDecode } from 'jwt-decode'

const authSlice = createSlice({
    name: 'auth',
    initialState: { 
        token: null,
        role : null,
        email: null
    },
    reducers: {
        setCredentials: (state, action) => {
            const { accessToken } = action.payload
            state.token = accessToken
            let decoded = jwtDecode(accessToken)
            state.role = decoded.userInfo.role
            state.email = decoded.userInfo.email
        },
        logOut: (state, action) => {
            state.token = null
            state.role = null
            state.email = null
        },
    }
})

export const { setCredentials, logOut } = authSlice.actions

export default authSlice.reducer

export const selectCurrentToken = (state) => state.auth.token

export const selectCurrentUserRole = (state) => state.auth.role

export const selectCurrentUserEmail = (state) => state.auth.email

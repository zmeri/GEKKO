import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)
/* eslint-disable no-multi-spaces */
const store = new Vuex.Store({
  state: {
    numPlots: 0,                  // id: 0 is always the fullscreen plot
    communicationError: false,    // Whether there is a communication error with the backend
    fullscreenPlot: false,        // Whether the fullscreen plot should be displayed
    plotIdCounter: 0,             // Used for giving new plots externalIds
    plots: [
      // id: number
      // data: Object
      // layout: Object
    ],
    plotData: {
      // A list of traces as returned by updatePlotData
      // initialized in App.vue
    },
    modelData: {
      // list of gekko model attributes
    },
    varsData: {
      // list of gekko variable objects
    },
    showErrorModal: false,
    // Object deupdatePlotsscribing communication errors with the backend
    httpError: {
      header: '',
      body: '',
      report: `Please report any Gekko project errors as
        issues at https://github.com/BYU-PRISM/GEKKO`
    },
    httpRoot: process.env.NODE_ENV === 'development' ? 'http://localhost:8050' : 'http://' + location.hostname + ':' + location.port
  },
  mutations: {
    removePlot: (state, data) => {
      state.numPlots--
      state.plots = state.plots.filter(plot => plot.id !== data)
    },
    addPlot (state, data) {
      state.plots.push({
        id: state.plotIdCounter,
        data: JSON.parse(JSON.stringify(state.plotData)),
        layout: {}
      })
      state.plotIdCounter++
      state.numPlots++
    },
    setCommunicationError (state, data) {
      if (!state.communicationError) {
        if (!state.showErrorModal) {
          state.showErrorModal = data
        }
        state.communicationError = data
      }
    },
    sethttpError (state, data) { state.httpError = data },
    showFullscreenPlot (state, data) { state.fullscreenPlot = data },
    setPlotData (state, data) {
      state.plotData = data
      for (var i = 0; i < state.plots.length; i++) {
        // Find a clever way to hot reload the plot data here
        var plotData = state.plots[i].data
        console.log('plotData', plotData)
        for (var j = 0; j < plotData.length; j++) {
          var trace = plotData[j]
          var updatedTrace = state.plotData.filter((t) => t.name === trace.name)[0]
          trace.x = updatedTrace.x
          trace.y = updatedTrace.y
        }
        console.log('updated plots', state.plots)
      }
    },
    updatePlotLayout (state, data) { state.plots.filter(p => p.id === data.id)[0].layout = data.layout },
    setModelData (state, data) { state.modelData = data },
    setVarsData (state, data) { state.varsData = data },
    showErrorModal (state, data) { state.showErrorModal = data }
  },
  actions: {
    get_data ({commit, state}) {
      var api1 = fetch(`${this.state.httpRoot}/data`)
        .then(data => data.json())
        .then(data => {
          commit('setModelData', data.model)
          var plotArray = []
          const isMuchData = (
            data.vars.variables.length + data.vars.parameters.length +
            data.vars.intermediates.length + data.vars.constants.length
          ) > 5
          const v = data.vars
          for (var set in data.vars) {
            for (var variable in v[set]) {
              const trace = {
                x: data.time,
                y: v[set][variable].data,
                mode: 'lines',
                type: 'scatter',
                name: v[set][variable].name,
                visible: isMuchData ? 'legendonly' : 'true'
              }
              plotArray.push(trace)
            }
          }
          commit('setPlotData', plotArray)
        })
        .catch(err => {
          console.log('Error fetching from get_data:', err)
        })
      const ignoredProps = ['INFO', 'APM']
      let options
      let varsData = {}
      var api2 = fetch(`${this.state.httpRoot}/get_options`)
        .then(data => data.json())
        .then(obj => {
          options = obj
          return Object.keys(obj).filter(key => !ignoredProps.includes(key))
        })
        .then(keys => {
          keys.forEach(key => {
            varsData[key] = options[key]
            varsData[key].ishidden = true
            return null
          })
        }).then(() => {
          commit('setVarsData', varsData)
        })
      return Promise.all([api1, api2])
    },
    initialize ({commit, dispatch}) {
      // FIXME: Error on below line. `.then` is actually called before the action returns
      dispatch('get_data').then(() => {
        commit('addPlot') // First plot added is the hidden fullscreen plot
        commit('updatePlotLayout', {id: 0, layout: {'height': window.innerHeight - 150}})
        commit('addPlot') // Second plot is the one shown on the main page
      })
    },
    poll ({commit, dispatch}) {
      fetch(`${this.state.httpRoot}/poll`)
        .then(resp => resp.json())
        .then(body => {
          if (body.updates === true) {
            console.log('Updating...')
            dispatch('get_data')
          }
          this.showModal = false
          commit('setCommunicationError', false)
          setTimeout(() => {
            dispatch('poll')
          }, 1000)
        }, error => {
          console.log('HTTP Polling Error, Status:', error.status, 'Message:', error.statusText)
          if (error.status === 0) {
            commit('sethttpError', {
              header: 'Internal Communication Error',
              body: `We seem to have lost communication with your
                    Gekko script. This means that we cannot get
                    any updates from your Gekko model.
                    Did you stop the script or did
                    it crash? If so, close this window and restart
                    it.`,
              report: `Please report any Gekko project errors as
                issues at https://github.com/BYU-PRISM/GEKKO`
            })
          } else {
            commit('sethttpError', {
              header: 'Internal Communication Error',
              body: `Please copy these details in an error report
                    to the Gekko developers. Error Code:
                    ${error.status}, Error: ${error.statusText}`,
              report: `Please report any Gekko project errors as
                issues at https://github.com/BYU-PRISM/GEKKO`
            })
          }
          commit('setCommunicationError', true)
        })
    }
  }
})

export default store
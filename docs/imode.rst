.. Gekko documentation master file, created by
   sphinx-quickstart on Fri Jul  7 22:01:18 2017.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.



.. _imode:

Modes
======


.. toctree::
	:maxdepth: 2




IMODE
-----
``model.options.IMODE`` defines the problem type. Each problem type treats variable classes differently and builds equations behind the scenes to meet the particular objective inherit to each problem type. The modes are:

+----------------------+------------------------+------------------------+------------------------+
|                      | Simulation             | Estimation             | Control                |
+----------------------+------------------------+------------------------+------------------------+
| Non-Dynamic          | `1` Steady-State (SS)  | `2` Steady-State (MPU) | `3` Steady-State (RTO) |
+----------------------+------------------------+------------------------+------------------------+
| Dynamic Simultaneous | `4` Simultaneous (SIM) | `5` Simultaneous (SIM) | `6` Simultaneous (CTL) |
+----------------------+------------------------+------------------------+------------------------+
| Dynamic Sequential   | `7` Sequential (SQS)   | `8` Sequential (SIM)   | `9` Sequential (CTL)   |
+----------------------+------------------------+------------------------+------------------------+


Dynamics
--------

Differential equations are specified by differentiation a variable with the `dt()` method. For example, velocity `v` is the derivative of position `x`::

    m.Equation( v == x.dt() )

Discretization is determined by the model `time` attribute. For example, `m.time = [0,1,2,3]` will discretize all equations and variable at the 4 points specified. Time or space discretization is available with Gekko, but not both. If the model contains a partial differential equation, the discretization in the other dimensions is performed with Gekko array operations as shown in the 
`hyperbolic and parabolic PDE Gekko examples <https://apmonitor.com/do/index.php/Main/PartialDifferentialEquations>`_.

Simultaneous methods use orthogonal collocation on finite elements to implicitly solve the differential and algebraic equation (DAE) system. Non-simulation simultaneous methods (modes 5 and 6) simultaneously optimize the objective and implicitly calculate the model/constraints. Simultaneous methods tend to perform better for problems with many degrees of freedom.

Sequential methods separate the NLP optimizer and the DAE simulator. Sequential methods satisfy the differential and algebraic equations, even when the solver is unable to find a feasible optimal solution.

Non-Dynamic modes sets all differential terms to zero to calculate steady-state conditions.

Simulation
----------

Steady-state simulation (IMODE=1) solves the given equations when all time-derivative terms set to zero. Dynamic simulation (IMODE=4,7) is either solved simultaneous (IMODE=4) or sequentially (IMODE=7). Both modes give the same solution but the sequential mode solves one time step and then time-shifts to solve the next time step. The simultaneous mode solves all time steps with one solve. Successful simulation of a model within GEKKO helps initialize and and facilitates the transition from model development/simulation to optimization. In all simulation modes (IMODE=1,4,7), the number of equations must equal the number of variables. 

Estimation
----------

MPU
^^^

Model Parameter Update (IMODE=2) is parameter estimation for non-dynamic data when the process is at steady-state. The same model instance is used for all data point sets that are rows in the data file. The purpose of MPU is to fit large data sets to the model and update parameters to match the predicted outcome with the measured outcome.  
.. This mode implements the special variable types as follows:

FV
""

Fixed variables are the same across all instances of the model that are calculated for each data row.

`STATUS` adds one degree of freedom for the optimizer, i.e. a parameter to adjust for fitting the predicted outcome to measured values.

`FSTATUS` allows a `MEAS` value to provide an initial guess (when `STATUS=1`) or a fixed measurement (when `STATUS=0`).

MV
""

Manipulated variables are like FVs, but can change with each data row, either calculated by the optimizer (`STATUS=1`) or specified by the user (`STATUS=0`).

`STATUS` adds one degree of freedom for each data row for the optimizer, i.e. an adjustable parameter that changes with each data row.

`FSTATUS` allows a `MEAS` value to provide an initial guess (when `STATUS=1`) or a fixed measurement (when `STATUS=0`).

.. SV
.. ""

CV
""

Controlled variables may include measurements that are aligned to model predicted values. A controlled variable
in estimation mode has objective function terms (squared or l1-norm error equations) built-in to facilitate the alignment.

If `FSTATUS` is on (`FSTATUS=1`), an objective function is added to minimize the
model prediction to the measurements. The error is either squared or absolute depending
on if `m.options.EV_TYPE` is 2 or 1, respectively. `FSTATUS` enables receiving measurements
through the `MEAS` attribute.

If `m.options.EV_TYPE = 1`, `CV.MEAS_GAP=v` will provide a dead-band of size `v` around the measurement to avoid fitting to measurement noise.

`STATUS` is ignored in MPU. Example applications with `parameter regression <http://apmonitor.com/wiki/index.php/Main/ParameterFit>`_ and `oil price regression <https://apmonitor.com/me575/index.php/Main/NonlinearRegression>`_ demonstrate MPU mode.

MHE
^^^

Moving Horizon Estimation (IMODE=5,8) is for dynamic estimation, both for states and parameter regression. The horizon to match is the discretized time horizon of the model `m.time`. `m.time` should be discretized at regular intervals. New measurements are added at the end of the horizon (e.g. `m.time[-1]`) and the oldest measurements (e.g. `m.time[0]`) are dropped off.

:ref:`timeshift` enables automatic shifting of all variables and parameters with each new solve of a model. The frequency of new measurements should match the discretization of `m.time`.

FV
""

Fixed variables are fixed through the horizon.

`STATUS` adds one degree of freedom for the optimizer, i.e. a fixed parameter for fit.

`FSTATUS` allows a `MEAS` value to provide an initial guess (when `STATUS=1`) or a fixed measurement (when `STATUS=0`).


MV
""

Manipulated variables are like FVs, but discretized with time.

`STATUS` adds one degree of freedom for each time point for the optimizer, i.e. a dynamic parameter for fit.

`FSTATUS` allows a `MEAS` value to provide an initial guess (when `STATUS=1`) or a fixed measurement (when `STATUS=0`).

.. SV
.. ""

CV
""

Controlled variables may include measurements that are aligned to model predicted values. A controlled variable
in estimation mode has objective function terms (squared or l1-norm error equations) built-in to facilitate the alignment.

If `FSTATUS` is on (`FSTATUS=1`), an objective function is added to minimize the
model prediction to the measurements. The error is either squared or absolute depending
on if `m.options.EV_TYPE` is 2 or 1, respectively. `FSTATUS` enables receiving measurements
through the `MEAS` attribute.

If `m.options.EV_TYPE = 1`, `CV.MEAS_GAP=v` will provide a dead-band of size `v` around the measurement to avoid fitting to measurement noise.

`STATUS` is ignored in MHE. Example `IMODE=5` application::

    from gekko import GEKKO
    
    t_data = [0, 0.1, 0.2, 0.4, 0.8, 1]
    x_data = [2.0,  1.6,  1.2, 0.7,  0.3,  0.15]
    
    m = GEKKO(remote=False)
    m.time = t_data
    x = m.CV(value=x_data); x.FSTATUS = 1  # fit to measurement
    k = m.FV(); k.STATUS = 1               # adjustable parameter
    m.Equation(x.dt()== -k * x)            # differential equation
    
    m.options.IMODE = 5   # dynamic estimation
    m.options.NODES = 5   # collocation nodes
    m.solve(disp=False)   # display solver output
    k = k.value[0]
    
    import numpy as np
    import matplotlib.pyplot as plt  # plot solution
    plt.plot(m.time,x.value,'bo',\
             label='Predicted (k='+str(np.round(k,2))+')')
    plt.plot(m.time,x_data,'rx',label='Measured')
    # plot exact solution
    t = np.linspace(0,1); xe = 2*np.exp(-k*t)
    plt.plot(t,xe,'k:',label='Exact Solution')
    plt.legend()
    plt.xlabel('Time'), plt.ylabel('Value')
    plt.show()


Control
-------

RTO
^^^^

Real-Time Optimization (RTO) is a steady-state mode that allows decision variables (`FV` or `MV` types with `STATUS=1`) or additional variables in excess of the number of equations. An objective function guides the selection of the additional variables to select the optimal feasible solution. RTO is the default mode for Gekko if `m.options.IMODE` is not specified.

.. FV
.. ""

.. MV
.. ""

.. SV
.. ""

.. CV
.. ""

MPC
^^^

Model Predictive Control (MPC) is implemented with `IMODE=6` as a simultaneous solution or with `IMODE=9` as a sequential shooting method.

.. FV
.. ""

.. MV
.. ""

.. SV
.. ""

.. CV
.. ""

Controlled variables (`CV`) have a reference trajectory or set point target range as the objective.
When `STATUS=1` for a CV, the objective includes a minimization between model predictions and the setpoint.

If `m.options.CV_TYPE=1`, the objective is an l1-norm (absolute error) with
a dead-band. The setpoint range should be specified with `SPHI` and `SPLO`.
If `m.options.CV_TYPE=2`, the objective is an l2-norm (squared error). The
setpoint should be specified with `SP`.

Example MPC (`IMODE=6`) application::

    from gekko import GEKKO
    import numpy as np
    import matplotlib.pyplot as plt  
    
    m = GEKKO()
    m.time = np.linspace(0,20,41)
    
    # Parameters
    mass = 500
    b = m.Param(value=50)
    K = m.Param(value=0.8)
    
    # Manipulated variable
    p = m.MV(value=0, lb=0, ub=100)
    p.STATUS = 1  # allow optimizer to change
    p.DCOST = 0.1 # smooth out gas pedal movement
    p.DMAX = 20   # slow down change of gas pedal
    
    # Controlled Variable
    v = m.CV(value=0)
    v.STATUS = 1  # add the SP to the objective
    m.options.CV_TYPE = 2 # squared error
    v.SP = 40     # set point
    v.TR_INIT = 1 # set point trajectory
    v.TAU = 5     # time constant of trajectory
    
    # Process model
    m.Equation(mass*v.dt() == -v*b + K*b*p)
    
    m.options.IMODE = 6 # control
    m.solve(disp=False)
    
    # get additional solution information
    import json
    with open(m.path+'//results.json') as f:
        results = json.load(f)
    
    plt.figure()
    plt.subplot(2,1,1)
    plt.plot(m.time,p.value,'b-',label='MV Optimized')
    plt.legend()
    plt.ylabel('Input')
    plt.subplot(2,1,2)
    plt.plot(m.time,results['v1.tr'],'k-',label='Reference Trajectory')
    plt.plot(m.time,v.value,'r--',label='CV Response')
    plt.ylabel('Output')
    plt.xlabel('Time')
    plt.legend(loc='best')
    plt.show()

The other setpoint options include
:ref:`tau`,
:ref:`tier`,
:ref:`tr_init`,
:ref:`tr_open`,
:ref:`wsp`,
:ref:`wsphi`, and
:ref:`wsplo`.
